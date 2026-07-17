package uz.ajdo.shajara.calls

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.twilio.audioswitch.AudioDevice
import io.livekit.android.LiveKit
import io.livekit.android.events.RoomEvent
import io.livekit.android.room.Room
import io.livekit.android.room.track.CameraPosition
import io.livekit.android.room.track.LocalVideoTrack
import io.livekit.android.room.track.Track
import io.livekit.android.room.track.VideoTrack
import io.livekit.android.room.track.screencapture.ScreenCaptureParams
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import uz.ajdo.shajara.R
import java.lang.ref.WeakReference
import java.util.Locale

/**
 * Qo'ng'iroq ulanishini (LiveKit Room) CallActivity umridan MUSTAQIL
 * saqlaydigan foreground xizmat.
 *
 * MUHIM (tuzatilgan xato): avval Room bevosita CallActivity ichida
 * yashardi — foydalanuvchi Uy tugmasini bossa, boshqa sahifaga o'tsa yoki
 * Recents'dan surib tashlasa, Android CallActivity.onDestroy()ni chaqirib
 * qo'yardi va u YOZILGAN HOLDA `room?.disconnect()`ni SO'ZSIZ chaqirardi —
 * natijada foydalanuvchi Qizil tugmani BOSMASDAN TURIB HAM qo'ng'iroq
 * tugab qolardi. Bundan tashqari, foreground xizmatsiz OS (ayniqsa
 * Xiaomi/Samsung kabi qattiq batareya boshqaruvchi qurilmalarda) fon
 * jarayonini istalgan payt o'ldirib yuborishi mumkin edi.
 *
 * Endi: bu xizmat qo'ng'iroq boshlanishi bilan ishga tushadi, doimiy
 * bildirishnoma ko'rsatadi (OS'ga "faol qo'ng'iroq bor" deb bildiradi) va
 * FAQAT quyidagi hollarda o'zini to'xtatadi: foydalanuvchi Qizil tugmani
 * bossa, boshqa tomon qo'ng'iroqni tugatsa, yoki 30 soniya ichida javob
 * kelmasa. CallActivity esa shunchaki UI qatlami — u yo'q qilinsa ham
 * (Activity qayta yaratilganda ham) xizmat va ulanish TIRIK qoladi;
 * foydalanuvchi ilovaga qaytganda CallActivity shu xizmatga qayta
 * ulanib (bind), joriy holatni ko'rsatadi.
 */
class CallService : Service() {
    companion object {
        private const val CHANNEL_ID = "active_call"
        private const val NOTIFICATION_ID = 5002
        private const val RING_TIMEOUT_MS = 30_000L
        private const val EXTRA_STARTING_VIDEO = "startingVideo"
        private const val ACTION_HANGUP = "uz.ajdo.shajara.calls.ACTION_HANGUP"

        /** CallActivity ilovaga qaytilganda "qayta boshlash shartmi yo'qmi"ni
         * shu bilan tekshiradi — allaqachon faol xizmat bo'lsa, yangi
         * invite/accept so'rov YUBORILMAYDI (dublikat qo'ng'iroqning oldini
         * oladi). */
        @Volatile var isRunning: Boolean = false
            private set

        /** CallActivity.bindToService() shu bilan xizmatni boshlaydi —
         * `isVideo`ni oldindan bildirish SHART, chunki startForeground()
         * turi (microphone yoki microphone+camera) shu asosida ANIQ
         * tanlanishi kerak (pastga qarang: onStartCommand). */
        fun startIntent(context: android.content.Context, isVideo: Boolean): Intent =
            Intent(context, CallService::class.java).putExtra(EXTRA_STARTING_VIDEO, isVideo)

        // IncomingCallActivity'dagi bilan BIR XIL naqsh — bitta jarayonda
        // faqat bitta faol qo'ng'iroq xizmati bo'ladi, shu bois statik
        // zaif havola orqali kuzatiladi.
        private var activeInstance: WeakReference<CallService>? = null

        /** AjdoFirebaseMessagingService (Java) `call_accepted` push kelganda
         * chaqiradi — chaqiruvchi (bu qurilma) hali WebRTC darajasida boshqa
         * tomonni ko'rmagan bo'lsa ham (ParticipantConnected hodisasi bir
         * necha soniya kechikishi mumkin), SIGNALIZATSIYA darajasida
         * ALLAQACHON qabul qilingani ma'lum bo'lgani uchun 30 soniyalik
         * jiringlash taymerini DARHOL bekor qiladi. Aks holda: qabul
         * qiluvchining WebRTC ulanishi biroz kechiksa (masalan sekin
         * tarmoq) va aynan shu payt 30s chegarasiga to'g'ri kelib qolsa,
         * taymer ALLAQACHON qabul qilingan qo'ng'iroqni "javob berilmadi"
         * deb noto'g'ri yakunlab, /calls/end so'rovini yuborardi.
         */
        @JvmStatic
        fun cancelRingTimeoutFor(callId: String) {
            activeInstance?.get()?.let { service ->
                if (service.callId == callId) service.ringTimeoutJob?.cancel()
            }
        }

        /** AjdoFirebaseMessagingService `call_declined` push kelganda chaqiradi —
         * qabul qiluvchi Rad etish tugmasini bosganda chaqiruvchi (bu qurilma)
         * hali LiveKit darajasida HECH QANDAY hodisa ko'rmaydi (suhbatdosh
         * hech qachon xonaga qo'shilmagan), shu bois bu haqda bilishning
         * BOSHQA yo'li yo'q — socket bo'lmagani uchun (call_accepted push'idagi
         * bilan bir xil sabab) faqat 30 soniyalik ring-timeout orqali
         * "javob berilmadi" deb yakunlanardi. Endi DARHOL yakunlanadi —
         * backend allaqachon holatni yangilagani uchun notifyBackend=false.
         */
        @JvmStatic
        fun endCallFor(callId: String) {
            activeInstance?.get()?.let { service ->
                if (service.callId == callId) service.endCall(notifyBackend = false)
            }
        }
    }

    interface Listener {
        /** Har qanday holat o'zgarishida (mute, kamera, ulanish holati,
         * vaqt hisoblagich, ...) — UI shu orqali qayta chizadi. Granular
         * callback'lar o'rniga bitta umumiy signal (qo'ng'iroq UI'si
         * murakkab emas, har safar to'liq holatni o'qib qayta chizish
         * yetarli va soddaroq). */
        fun onCallStateChanged()

        /** Masofaviy video trek kelganda/ketganda (renderer View qatlamiga
         * tegishli bo'lgani uchun Activity o'zi biriktiradi/uzadi). */
        fun onRemoteVideoTrack(track: VideoTrack?)

        /** Qo'ng'iroq butunlay tugadi — Activity finish() qilishi kerak. */
        fun onCallEnded()
    }

    inner class LocalBinder : Binder() {
        fun service(): CallService = this@CallService
    }

    private val binder = LocalBinder()
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var listener: Listener? = null

    private var room: Room? = null
    var callId: String? = null
        private set
    var isVideo = false
        private set
    var outgoing = false
        private set
    var peerName = "AJDO"
        private set
    var peerPhotoUrl: String? = null
        private set
    var peerRelation: String? = null
        private set
    var micMuted = false
        private set
    var cameraOff = false
        private set
    var speakerOn = false
        private set
    var screenSharing = false
        private set
    var hadRemotePeer = false
        private set
    /** Suhbatdoshning kamераsi o'chiqmi (umuman ulashilmagan yoki
     * pauza qilingan) — video hali kelmagan bo'lsa TRUE (standart). */
    var remoteCameraOff = true
        private set
    var remoteMicMuted = false
        private set
    private var usingFrontCamera = true
    private var callStartElapsedMs: Long? = null
    private var timerJob: Job? = null
    private var ringTimeoutJob: Job? = null

    /** "MM:SS" (ulangandan keyin) yoki "Chaqirilmoqda.../Kutilmoqda..." kabi
     * holat matni — CallActivity buni bevosita ko'rsatadi. */
    var statusLabel: String = ""
        private set

    private fun breadcrumb(msg: String) {
        try {
            FirebaseCrashlytics.getInstance().log(msg)
        } catch (_: Exception) {
        }
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        activeInstance = WeakReference(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Doimiy bildirishnomadagi (CallStyle) "Yakunlash" tugmasi shu
        // orqali ishlaydi — Activity ochilmasdan, to'g'ridan-to'g'ri xizmatga.
        if (intent?.action == ACTION_HANGUP) {
            breadcrumb("CallService: hangup from notification action")
            endCall(notifyBackend = true)
            return START_NOT_STICKY
        }
        // MUHIM: foregroundServiceType="camera" bilan startForeground()
        // chaqirish uchun ilova CAMERA ruxsatini ALLAQACHON ushlab turishi
        // SHART (Android 14+), aks holda SecurityException. Ovozli
        // (video EMAS) qo'ng'iroqda foydalanuvchidan CAMERA ruxsati
        // umuman so'ralmaydi — shu bois turni CHAQIRUV TURIGA (isVideo)
        // qarab ANIQ tanlaymiz, doim "camera" turini ISHLATMAYMIZ.
        val startingVideo = intent?.getBooleanExtra(EXTRA_STARTING_VIDEO, false) ?: isVideo
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (startingVideo) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
            } else {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            }
        } else {
            0
        }
        if (type != 0) {
            startForeground(NOTIFICATION_ID, buildNotification(), type)
        } else {
            startForeground(NOTIFICATION_ID, buildNotification())
        }
        // START_STICKY EMAS — OS jarayonni o'ldirsa, qo'ng'iroq shunchaki
        // tugagan hisoblanadi (qayta jonlantirilganda eskirgan Room bilan
        // ulanishga urinish xavfli/ma'nosiz).
        return START_NOT_STICKY
    }

    fun setListener(l: Listener?) {
        listener = l
    }

    /** CallActivity qayta bog'langanda (masalan foydalanuvchi ilovaga
     * qaytganda) joriy remote video trekni (bo'lsa) darhol olish uchun. */
    fun currentRemoteVideoTrack(): VideoTrack? {
        val r = room ?: return null
        for (p in r.remoteParticipants.values) {
            val pub = p.getTrackPublication(Track.Source.CAMERA) ?: p.getTrackPublication(Track.Source.SCREEN_SHARE)
            val track = pub?.track
            if (track is VideoTrack) return track
        }
        return null
    }

    fun localVideoTrack(): VideoTrack? {
        val pub = room?.localParticipant?.getTrackPublication(Track.Source.CAMERA)
        return pub?.track as? VideoTrack
    }

    fun initVideoRenderer(renderer: io.livekit.android.renderer.TextureViewRenderer) {
        room?.initVideoRenderer(renderer)
    }

    // ---------- Qo'ng'iroqni boshlash ----------

    // MUHIM: invite() so'rovi tugagunga qadar `room` hali null bo'ladi —
    // shu oraliqda CallActivity (nazariy jihatdan) qayta bog'lanib,
    // startOutgoing()ni IKKINCHI marta chaqirishi mumkin edi (masalan juda
    // tez ketma-ket qayta yaratilsa). `starting` bayrog'i buni oldini oladi.
    private var starting = false

    fun startOutgoing(calleeId: String, type: String, name: String, photoUrl: String?, relation: String?) {
        if (starting || (isRunning && room != null)) return // allaqachon boshlangan (qayta bog'lanish)
        starting = true
        isVideo = type == "VIDEO"
        outgoing = true
        peerName = name
        peerPhotoUrl = photoUrl
        peerRelation = relation
        statusLabel = "Chaqirilmoqda..."
        updateNotification()
        listener?.onCallStateChanged()
        startRingTimeout()
        scope.launch {
            try {
                breadcrumb("CallService.startOutgoing invite")
                val res = CallsHttp.invite(this@CallService, calleeId, type)
                callId = res.getString("callId")
                breadcrumb("CallService.startOutgoing invite OK callId=$callId")
                connectRoom(res.getString("livekitUrl"), res.getString("token"))
            } catch (e: Exception) {
                breadcrumb("CallService.startOutgoing FAILED: ${e.message}")
                FirebaseCrashlytics.getInstance().recordException(e)
                statusLabel = "Xatolik: ${e.message}"
                starting = false
                listener?.onCallStateChanged()
            }
        }
    }

    fun startAccepted(id: String, type: String, token: String, livekitUrl: String, name: String, photoUrl: String?, relation: String?) {
        if (starting || (isRunning && room != null)) return
        starting = true
        callId = id
        isVideo = type == "VIDEO"
        outgoing = false
        peerName = name
        peerPhotoUrl = photoUrl
        peerRelation = relation
        statusLabel = "Kutilmoqda..."
        updateNotification()
        listener?.onCallStateChanged()
        connectRoom(livekitUrl, token)
    }

    private fun connectRoom(url: String, token: String) {
        breadcrumb("CallService.connectRoom start")
        scope.launch {
            val newRoom = LiveKit.create(applicationContext)
            room = newRoom
            starting = false
            observeEvents(newRoom)
            try {
                newRoom.connect(url, token)
                newRoom.localParticipant.setMicrophoneEnabled(true)
                if (isVideo) {
                    newRoom.localParticipant.setCameraEnabled(true)
                    listener?.onCallStateChanged()
                    // Video qo'ng'iroqda standart bo'yicha gromkogovoritel
                    // (Telegram/WhatsApp odati) — ekranga qarab gaplashiladi.
                    selectAudioDevice(preferSpeaker = true)
                }
                updateConnectionStatus(newRoom)
                breadcrumb("CallService.connectRoom OK remoteParticipants=${newRoom.remoteParticipants.size}")
            } catch (e: Exception) {
                breadcrumb("CallService.connectRoom FAILED: ${e.message}")
                FirebaseCrashlytics.getInstance().recordException(e)
                statusLabel = "Ulanib bo'lmadi: ${e.message}"
                listener?.onCallStateChanged()
            }
        }
    }

    private fun startRingTimeout() {
        ringTimeoutJob?.cancel()
        ringTimeoutJob = scope.launch {
            delay(RING_TIMEOUT_MS)
            if (!hadRemotePeer) {
                breadcrumb("CallService ring timeout - no answer within 30s")
                statusLabel = "Javob berilmadi"
                listener?.onCallStateChanged()
                delay(700)
                endCall(notifyBackend = true)
            }
        }
    }

    private fun updateConnectionStatus(observedRoom: Room) {
        if (observedRoom.remoteParticipants.isNotEmpty()) {
            hadRemotePeer = true
            ringTimeoutJob?.cancel()
            if (callStartElapsedMs == null) {
                callStartElapsedMs = SystemClock.elapsedRealtime()
                startTimer()
            }
        } else {
            statusLabel = if (outgoing) "Chaqirilmoqda..." else "Kutilmoqda..."
        }
        updateNotification()
        listener?.onCallStateChanged()
    }

    private fun startTimer() {
        stopTimer()
        timerJob = scope.launch {
            while (true) {
                val start = callStartElapsedMs ?: break
                val elapsedSec = (SystemClock.elapsedRealtime() - start) / 1000
                val mm = elapsedSec / 60
                val ss = elapsedSec % 60
                statusLabel = String.format(Locale.US, "%02d:%02d", mm, ss)
                listener?.onCallStateChanged()
                if (elapsedSec % 15 == 0L) updateNotification()
                delay(1000)
            }
        }
    }

    private fun stopTimer() {
        timerJob?.cancel()
        timerJob = null
    }

    /** Suhbatdoshning kamera/mikrofon holatini yangilaydi — qo'ng'iroq
     * ekranida "Kamera o'chirilgan"/"Mikrofon o'chirilgan" belgilarini
     * ko'rsatish uchun (Telegram/Zoom uslubi). Nashr qilinmagan (hali
     * umuman ulashilmagan) trek ham "o'chiq" deb hisoblanadi — faqat
     * pauza (muted) emas. */
    private fun refreshRemoteMediaState(observedRoom: Room) {
        val remote = observedRoom.remoteParticipants.values.firstOrNull()
        val camPub = remote?.getTrackPublication(Track.Source.CAMERA)
        val micPub = remote?.getTrackPublication(Track.Source.MICROPHONE)
        remoteCameraOff = camPub == null || camPub.muted
        remoteMicMuted = micPub == null || micPub.muted
        listener?.onCallStateChanged()
    }

    private fun observeEvents(observedRoom: Room) {
        scope.launch {
            observedRoom.events.events.collect { event ->
                if (room !== observedRoom) return@collect
                try {
                    if (event is RoomEvent.TrackSubscribed) {
                        val track = event.track
                        if (track is VideoTrack) listener?.onRemoteVideoTrack(track)
                        refreshRemoteMediaState(observedRoom)
                    }
                    if (event is RoomEvent.TrackUnsubscribed) {
                        if (event.track is VideoTrack) listener?.onRemoteVideoTrack(currentRemoteVideoTrack())
                        refreshRemoteMediaState(observedRoom)
                    }
                    if (event is RoomEvent.TrackMuted || event is RoomEvent.TrackUnmuted ||
                        event is RoomEvent.TrackPublished || event is RoomEvent.TrackUnpublished
                    ) {
                        refreshRemoteMediaState(observedRoom)
                    }
                    if (event is RoomEvent.ParticipantConnected) {
                        updateConnectionStatus(observedRoom)
                        refreshRemoteMediaState(observedRoom)
                    }
                    if (event is RoomEvent.ParticipantDisconnected) {
                        // MUHIM: boshqa tomon Qizil tugmani bossa, BU tomon
                        // xonada yakka qolgan holda EKRANDA/XIZMATDA qolib
                        // ketmasligi kerak — haqiqiy suhbatdosh bor edi-yu,
                        // endi hech kim qolmagan bo'lsa, qo'ng'iroq TUGADI.
                        if (hadRemotePeer && observedRoom.remoteParticipants.isEmpty()) {
                            statusLabel = "Qo'ng'iroq tugadi"
                            stopTimer()
                            listener?.onCallStateChanged()
                            delay(700)
                            if (room === observedRoom) endCall(notifyBackend = false)
                        } else {
                            updateConnectionStatus(observedRoom)
                        }
                    }
                    if (event is RoomEvent.Disconnected) {
                        endCall(notifyBackend = false)
                    }
                } catch (e: Exception) {
                    breadcrumb("CallService observeEvents FAILED: ${e.message}")
                    FirebaseCrashlytics.getInstance().recordException(e)
                }
            }
        }
    }

    // ---------- Boshqaruv (mikrofon/kamera/gromkogovoritel/ekran) ----------

    fun toggleMic() {
        micMuted = !micMuted
        scope.launch { room?.localParticipant?.setMicrophoneEnabled(!micMuted) }
        listener?.onCallStateChanged()
    }

    fun toggleCamera() {
        cameraOff = !cameraOff
        scope.launch {
            room?.localParticipant?.setCameraEnabled(!cameraOff)
            listener?.onCallStateChanged()
        }
    }

    fun switchCamera() {
        val track = room?.localParticipant?.getTrackPublication(Track.Source.CAMERA)?.track as? LocalVideoTrack ?: return
        usingFrontCamera = !usingFrontCamera
        track.switchCamera(position = if (usingFrontCamera) CameraPosition.FRONT else CameraPosition.BACK)
    }

    /** LiveKit'ning o'z audio marshrutlash tizimi (AudioSwitch kutubxonasi
     * o'rovchisi) orqali — xom AudioManager.isSpeakerphoneOn EMAS, bu
     * Bluetooth/simli quloqchin bilan ziddiyatga kirmasligi uchun muhim. */
    private fun selectAudioDevice(preferSpeaker: Boolean) {
        val handler = room?.audioSwitchHandler ?: return
        val available = handler.availableAudioDevices
        val target = if (preferSpeaker) {
            available.filterIsInstance<AudioDevice.Speakerphone>().firstOrNull()
        } else {
            available.filterIsInstance<AudioDevice.Earpiece>().firstOrNull()
                ?: available.filterIsInstance<AudioDevice.WiredHeadset>().firstOrNull()
        }
        if (target != null) {
            handler.selectDevice(target)
            speakerOn = target is AudioDevice.Speakerphone
            listener?.onCallStateChanged()
        }
    }

    fun toggleSpeaker() {
        selectAudioDevice(preferSpeaker = !speakerOn)
    }

    fun startScreenShare(captureData: Intent) {
        startForegroundService(Intent(this, ScreenCaptureService::class.java))
        scope.launch {
            room?.localParticipant?.setScreenShareEnabled(true, ScreenCaptureParams(captureData))
            screenSharing = true
            listener?.onCallStateChanged()
        }
    }

    fun stopScreenShare() {
        scope.launch { room?.localParticipant?.setScreenShareEnabled(false) }
        stopService(Intent(this, ScreenCaptureService::class.java))
        screenSharing = false
        listener?.onCallStateChanged()
    }

    // ---------- Tugatish ----------

    /** Foydalanuvchi Qizil tugmani bossa (notifyBackend=true) yoki boshqa
     * tomon allaqachon chiqib ketgani aniqlansa (notifyBackend=false)
     * chaqiriladi. Xizmatning o'zi ham shu bilan to'xtaydi. */
    fun endCall(notifyBackend: Boolean) {
        val id = callId
        if (notifyBackend && id != null) {
            scope.launch { runCatching { CallsHttp.end(this@CallService, id) } }
        }
        stopTimer()
        ringTimeoutJob?.cancel()
        room?.disconnect()
        room = null
        stopService(Intent(this, ScreenCaptureService::class.java))
        listener?.onCallEnded()
        stopSelf()
    }

    override fun onDestroy() {
        isRunning = false
        if (activeInstance?.get() === this) activeInstance = null
        stopTimer()
        ringTimeoutJob?.cancel()
        room?.disconnect()
        room = null
        scope.cancel()
        super.onDestroy()
    }

    // ---------- Bildirishnoma ----------

    private fun buildNotification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Faol qo'ng'iroq", NotificationManager.IMPORTANCE_LOW),
            )
        }
        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, CallActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val hangUpIntent = PendingIntent.getService(
            this,
            1,
            Intent(this, CallService::class.java).setAction(ACTION_HANGUP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        // NotificationCompat.CallStyle — Android'ning telefon qo'ng'iroqlari
        // uchun MO'LJALLANGAN rasmiy uslubi (Telegram/WhatsApp shunga o'xshash
        // ko'rinish ishlatadi): yashil "davom etayotgan qo'ng'iroq" ko'rinishi,
        // status panelida chip, bevosita bildirishnomadan "Yakunlash" tugmasi.
        val person = androidx.core.app.Person.Builder().setName(peerName).build()
        val style = NotificationCompat.CallStyle.forOngoingCall(person, hangUpIntent)
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(peerName)
            .setContentText(statusLabel.ifBlank { "Qo'ng'iroq davom etmoqda" })
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setOngoing(true)
            .setContentIntent(contentIntent)
            .setStyle(style)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .build()
    }

    private fun updateNotification() {
        try {
            val manager = getSystemService(NotificationManager::class.java)
            manager.notify(NOTIFICATION_ID, buildNotification())
        } catch (_: Exception) {
        }
    }
}
