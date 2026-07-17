package uz.ajdo.shajara.calls

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Outline
import android.graphics.drawable.GradientDrawable
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.os.SystemClock
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.firebase.crashlytics.FirebaseCrashlytics
import io.livekit.android.LiveKit
import io.livekit.android.events.RoomEvent
import io.livekit.android.renderer.TextureViewRenderer
import io.livekit.android.room.Room
import io.livekit.android.room.track.VideoTrack
import io.livekit.android.room.track.screencapture.ScreenCaptureParams
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import uz.ajdo.shajara.R
import java.util.Locale

/**
 * To'liq native (WebView emas) qo'ng'iroq ekrani — LiveKit Android SDK
 * bilan to'g'ridan-to'g'ri ishlaydi. Ikkita boshlanish yo'li bor:
 *  - CHIQUVCHI: CallPlugin.startCall() shu Activity'ni EXTRA_OUTGOING=true
 *    bilan ochadi, o'zi /calls/invite so'raydi (CallsHttp).
 *  - KIRUVCHI: IncomingCallActivity foydalanuvchi "Qabul qilish"ni
 *    bosgandan KEYIN (/calls/accept allaqachon so'ralgan) shu Activity'ni
 *    tayyor roomName/token/livekitUrl bilan ochadi.
 *
 * UI — Telegram/Apple uslubidagi qo'ng'iroq ekrani: markazda boshqa
 * tomonning avatari (rasm yoki ism bosh harfi) + ismi + holat/vaqt
 * hisoblagichi, pastda boshqaruv tugmalari (yumaloq).
 */
class CallActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_CALLEE_ID = "calleeId"
        const val EXTRA_CALL_TYPE = "callType"
        const val EXTRA_OUTGOING = "outgoing"
        const val EXTRA_CALL_ID = "callId"
        const val EXTRA_ROOM_NAME = "roomName"
        const val EXTRA_TOKEN = "token"
        const val EXTRA_LIVEKIT_URL = "livekitUrl"
        const val EXTRA_PEER_NAME = "peerName"
        const val EXTRA_PEER_PHOTO_URL = "peerPhotoUrl"
        const val EXTRA_PEER_RELATION = "peerRelation"
        private const val RING_TIMEOUT_MS = 30_000L
    }

    private var room: Room? = null
    private var callId: String? = null
    private var isVideo = false
    private var micMuted = false
    private var cameraOff = false
    private var screenSharing = false
    private var peerName = "AJDO"
    private var hadRemotePeer = false
    private var callStartElapsedMs: Long? = null
    private var timerJob: Job? = null
    private var ringTimeoutJob: Job? = null

    private lateinit var remoteVideoContainer: FrameLayout
    private lateinit var centerOverlay: LinearLayout
    private lateinit var avatarPhotoView: ImageView
    private lateinit var avatarInitialsView: TextView
    private lateinit var nameView: TextView
    private lateinit var relationView: TextView
    private lateinit var statusText: TextView
    private lateinit var topBadge: LinearLayout
    private lateinit var topBadgeText: TextView
    private lateinit var controlsRow: LinearLayout

    private fun breadcrumb(msg: String) {
        try {
            FirebaseCrashlytics.getInstance().log(msg)
        } catch (_: Exception) {
        }
    }

    private fun dp(value: Int): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

    private val screenCaptureLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val data = result.data
            if (result.resultCode == Activity.RESULT_OK && data != null) {
                startForegroundService(Intent(this, ScreenCaptureService::class.java))
                lifecycleScope.launch {
                    room?.localParticipant?.setScreenShareEnabled(true, ScreenCaptureParams(data))
                    screenSharing = true
                }
            }
        }

    // Mikrofon/kamera RUNTIME ruxsati (Android 6.0+) manifestda e'lon
    // qilingani bilan yetarli emas — so'ralmasa, LiveKit SDK'ning audio/video
    // olish kodi (WebRTC, alohida native/thread ustida) tutilmagan
    // SecurityException tashlab, BUTUN ilovani krash qiladi (WebView JS
    // try/catch buni ushlay olmaydi, chunki bu native tomonda sodir bo'ladi).
    //
    // Callback'dagi `grants` xaritasi FAQAT shu chaqiruvda SO'RALGAN
    // ruxsatlarni o'z ichiga oladi — agar RECORD_AUDIO oldingi qo'ng'iroqdan
    // allaqachon berilgan bo'lsa-yu, faqat CAMERA so'ralayotgan bo'lsa,
    // `grants[RECORD_AUDIO]` xaritada UMUMAN yo'q (`null`), `null == true`
    // esa `false` — shu sabab qayta tekshiruvni `checkSelfPermission` bilan,
    // TO'LIQ joriy holatga qarab qilamiz (faqat shu chaqiruv natijasiga emas).
    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { _ ->
            if (hasRequiredPermissions()) {
                proceedWithCall()
            } else {
                statusText.text = "Mikrofon/kamera ruxsati kerak"
                lifecycleScope.launch {
                    delay(1500)
                    finish()
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        breadcrumb("CallActivity.onCreate outgoing=${intent.getBooleanExtra(EXTRA_OUTGOING, false)} type=${intent.getStringExtra(EXTRA_CALL_TYPE)}")
        buildUi()
        startCallFlow()
    }

    // launchMode="singleTask" (AndroidManifest.xml) — agar shu Activity'ning
    // eski nusxasi hali tirik bo'lsa (masalan oldingi qo'ng'iroq hali
    // to'liq yopilmagan bo'lsa), Android YANGI onCreate() chaqirmaydi,
    // yangi Intent'ni shu yerga (onNewIntent) yuboradi. Bu override
    // BO'LMASA, `intent`/`callId`/`isVideo` ESKI (oldingi) qo'ng'iroqning
    // ma'lumotlarida qolib ketadi — natijada yangi qo'ng'iroq NOTO'G'RI
    // xona/turdagi ma'lumot bilan ulanadi.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        breadcrumb("CallActivity.onNewIntent outgoing=${intent.getBooleanExtra(EXTRA_OUTGOING, false)} type=${intent.getStringExtra(EXTRA_CALL_TYPE)}")
        setIntent(intent)
        room?.disconnect()
        room = null
        micMuted = false
        cameraOff = false
        screenSharing = false
        hadRemotePeer = false
        callStartElapsedMs = null
        stopTimer()
        ringTimeoutJob?.cancel()
        buildUi()
        startCallFlow()
    }

    private fun startCallFlow() {
        isVideo = intent.getStringExtra(EXTRA_CALL_TYPE) == "VIDEO"
        callId = intent.getStringExtra(EXTRA_CALL_ID)
        peerName = intent.getStringExtra(EXTRA_PEER_NAME) ?: "AJDO"
        val peerPhotoUrl = intent.getStringExtra(EXTRA_PEER_PHOTO_URL)
        val peerRelation = intent.getStringExtra(EXTRA_PEER_RELATION)
        nameView.text = peerName
        relationView.text = peerRelation
        relationView.visibility = if (peerRelation.isNullOrBlank()) View.GONE else View.VISIBLE
        CallAvatar.bind(avatarPhotoView, avatarInitialsView, peerName, peerPhotoUrl)
        breadcrumb("startCallFlow isVideo=$isVideo hasPermissions=${hasRequiredPermissions()}")

        if (hasRequiredPermissions()) {
            proceedWithCall()
        } else {
            val needed = mutableListOf(Manifest.permission.RECORD_AUDIO)
            if (isVideo) needed.add(Manifest.permission.CAMERA)
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    private fun hasRequiredPermissions(): Boolean {
        val micGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        val camGranted = !isVideo || ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        return micGranted && camGranted
    }

    private fun proceedWithCall() {
        if (intent.getBooleanExtra(EXTRA_OUTGOING, false)) {
            startOutgoingCall()
        } else {
            val roomToken = intent.getStringExtra(EXTRA_TOKEN)
            val livekitUrl = intent.getStringExtra(EXTRA_LIVEKIT_URL)
            if (roomToken != null && livekitUrl != null) {
                connectRoom(livekitUrl, roomToken)
            } else {
                finish()
            }
        }
    }

    private fun startOutgoingCall() {
        val calleeId = intent.getStringExtra(EXTRA_CALLEE_ID)
        val type = intent.getStringExtra(EXTRA_CALL_TYPE) ?: "AUDIO"
        if (calleeId == null) {
            finish()
            return
        }
        statusText.text = "Chaqirilmoqda..."
        breadcrumb("startOutgoingCall calling CallsHttp.invite")
        startRingTimeout()
        lifecycleScope.launch {
            try {
                val res = CallsHttp.invite(this@CallActivity, calleeId, type)
                callId = res.getString("callId")
                breadcrumb("startOutgoingCall invite OK callId=$callId")
                connectRoom(res.getString("livekitUrl"), res.getString("token"))
            } catch (e: Exception) {
                breadcrumb("startOutgoingCall invite FAILED: ${e.message}")
                FirebaseCrashlytics.getInstance().recordException(e)
                statusText.text = "Xatolik: ${e.message}"
            }
        }
    }

    private fun connectRoom(url: String, token: String) {
        breadcrumb("connectRoom start url=$url")
        lifecycleScope.launch {
            val newRoom = LiveKit.create(applicationContext)
            room = newRoom
            observeEvents(newRoom)
            try {
                breadcrumb("connectRoom: room.connect()")
                newRoom.connect(url, token)
                breadcrumb("connectRoom: connected, enabling microphone")
                newRoom.localParticipant.setMicrophoneEnabled(true)
                breadcrumb("connectRoom: microphone enabled")
                if (isVideo) {
                    breadcrumb("connectRoom: enabling camera")
                    newRoom.localParticipant.setCameraEnabled(true)
                    breadcrumb("connectRoom: camera enabled")
                }
                // MUHIM: "Ulandi" shu yergacha FAQAT shu qurilmaning O'ZI
                // LiveKit'ga muvaffaqiyatli ulanganini bildirar edi — boshqa
                // tomon HALI QO'SHILMAGAN bo'lsa ham! Endi holat haqiqiy
                // ishtirokchilar soniga qarab aniqlanadi (pastda
                // ParticipantConnected/Disconnected orqali yangilanadi).
                updateConnectionStatus(newRoom)
                breadcrumb("connectRoom: local connect OK, remoteParticipants=${newRoom.remoteParticipants.size}")
            } catch (e: Exception) {
                breadcrumb("connectRoom FAILED: ${e.message}")
                FirebaseCrashlytics.getInstance().recordException(e)
                statusText.text = "Ulanib bo'lmadi: ${e.message}"
            }
        }
    }

    // Chaqiruvchi tomonda — hech kim 30 soniya ichida javob bermasa,
    // qo'ng'iroq CHEKSIZ jiringlab turmasligi kerak (Telegram/Apple
    // uslubi): avtomatik yakunlanadi (backend'da MISSED sifatida
    // belgilanadi — calls.service.ts'ning end() mantig'i).
    private fun startRingTimeout() {
        ringTimeoutJob?.cancel()
        ringTimeoutJob = lifecycleScope.launch {
            delay(RING_TIMEOUT_MS)
            if (!hadRemotePeer) {
                breadcrumb("Ring timeout - no answer within 30s, auto-ending")
                statusText.text = "Javob berilmadi"
                delay(700)
                finishCall(notifyBackend = true)
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
            controlsRow.visibility = View.VISIBLE
            controlsRowVisibilityBridge?.invoke(true)
        } else {
            controlsRow.visibility = View.GONE
            controlsRowVisibilityBridge?.invoke(false)
            statusText.text = if (intent.getBooleanExtra(EXTRA_OUTGOING, false)) "Chaqirilmoqda..." else "Kutilmoqda..."
        }
    }

    private fun startTimer() {
        stopTimer()
        timerJob = lifecycleScope.launch {
            while (true) {
                val start = callStartElapsedMs ?: break
                val elapsedSec = (SystemClock.elapsedRealtime() - start) / 1000
                val mm = elapsedSec / 60
                val ss = elapsedSec % 60
                statusText.text = String.format(Locale.US, "%02d:%02d", mm, ss)
                topBadgeText.text = String.format(Locale.US, "%s · %02d:%02d", peerName, mm, ss)
                delay(1000)
            }
        }
    }

    private fun stopTimer() {
        timerJob?.cancel()
        timerJob = null
    }

    private fun observeEvents(observedRoom: Room) {
        lifecycleScope.launch {
            // Room.events -&gt; EventListenable&lt;RoomEvent&gt;, uning o'zining
            // ".events" (SharedFlow&lt;RoomEvent&gt;) maydoni bor — shu bois ikki
            // qavat (LiveKit Android SDK 2.18.2 API'si shunday).
            observedRoom.events.events.collect { event ->
                breadcrumb("RoomEvent: ${event::class.simpleName}")
                // onNewIntent orqali ESKI xona almashtirilgan bo'lishi mumkin
                // (singleTask qayta ishlatish) — bu holatda eski xonaning
                // hodisalari YANGI boshlangan qo'ng'iroqqa ta'sir qilmasligi
                // kerak.
                if (room !== observedRoom) return@collect
                try {
                    if (event is RoomEvent.TrackSubscribed) {
                        val track = event.track
                        if (track is VideoTrack) {
                            val renderer = TextureViewRenderer(this@CallActivity)
                            observedRoom.initVideoRenderer(renderer)
                            track.addRenderer(renderer)
                            remoteVideoContainer.removeAllViews()
                            remoteVideoContainer.addView(
                                renderer,
                                FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT),
                            )
                            // Video oqim boshlanganda katta avatar/ism/holat
                            // markazdagi bloki video'ni to'sib turmasligi
                            // uchun kichik yuqori "chip"ga almashtiriladi
                            // (Telegram/Apple uslubidagi video-qo'ng'iroq
                            // ko'rinishi).
                            centerOverlay.visibility = View.GONE
                            topBadge.visibility = View.VISIBLE
                        }
                    }
                    if (event is RoomEvent.ParticipantConnected) {
                        breadcrumb("ParticipantConnected: ${event.participant.identity}")
                        updateConnectionStatus(observedRoom)
                    }
                    if (event is RoomEvent.ParticipantDisconnected) {
                        breadcrumb("ParticipantDisconnected: ${event.participant.identity}")
                        // MUHIM TUZATISH: avval faqat "Kutilmoqda..." matni
                        // yangilanardi — boshqa tomon Qizil (Yakunlash/Rad
                        // etish) tugmasini bossa, BU tomon xonada YAKKA
                        // qolgan holda EKRANDA QOLIB KETARDI. Endi: agar
                        // haqiqiy suhbatdosh BOR EDI-yu, endi hech kim
                        // qolmagan bo'lsa (1-1 qo'ng'iroq) — bu qo'ng'iroq
                        // TUGADI degani, shu tomon ham avtomatik chiqadi.
                        if (hadRemotePeer && observedRoom.remoteParticipants.isEmpty()) {
                            breadcrumb("Peer left, ending call for this side too")
                            statusText.text = "Qo'ng'iroq tugadi"
                            stopTimer()
                            lifecycleScope.launch {
                                delay(700)
                                if (room === observedRoom) finishCall(notifyBackend = false)
                            }
                        } else {
                            updateConnectionStatus(observedRoom)
                        }
                    }
                    if (event is RoomEvent.Disconnected) {
                        breadcrumb("RoomEvent.Disconnected -> finish()")
                        finish()
                    }
                } catch (e: Exception) {
                    // TextureViewRenderer/GL operatsiyalari ba'zi qurilmalarda
                    // (GPU drayveri farqiga qarab) xato tashlashi mumkin —
                    // bu HECH QANDAY try/catch tomonidan tutilmagan edi va
                    // Room hodisa oqimini yig'uvchi coroutine'ni butunlay
                    // yiqitib, oxir-oqibat ilovani krash qilishi mumkin edi.
                    breadcrumb("observeEvents handler FAILED: ${e.message}")
                    FirebaseCrashlytics.getInstance().recordException(e)
                }
            }
        }
    }

    private fun toggleMic() {
        micMuted = !micMuted
        lifecycleScope.launch { room?.localParticipant?.setMicrophoneEnabled(!micMuted) }
        refreshControlIcons()
    }

    private fun toggleCamera() {
        cameraOff = !cameraOff
        lifecycleScope.launch { room?.localParticipant?.setCameraEnabled(!cameraOff) }
        refreshControlIcons()
    }

    private fun toggleScreenShare() {
        if (screenSharing) {
            lifecycleScope.launch { room?.localParticipant?.setScreenShareEnabled(false) }
            stopService(Intent(this, ScreenCaptureService::class.java))
            screenSharing = false
        } else {
            val manager = getSystemService(MediaProjectionManager::class.java)
            screenCaptureLauncher.launch(manager.createScreenCaptureIntent())
        }
        refreshControlIcons()
    }

    /** `endCall`ning ichki qismi — foydalanuvchi Qizil tugmani bossa
     * (notifyBackend=true, backend'ga /calls/end so'raladi) yoki boshqa
     * tomon allaqachon chiqib ketgani aniqlansa (notifyBackend=false,
     * chunki backend holati allaqachon boshqa tomon so'rovi orqali
     * yangilangan) chaqiriladi. */
    private fun finishCall(notifyBackend: Boolean) {
        val id = callId
        if (notifyBackend && id != null) {
            lifecycleScope.launch { runCatching { CallsHttp.end(this@CallActivity, id) } }
        }
        stopTimer()
        ringTimeoutJob?.cancel()
        room?.disconnect()
        stopService(Intent(this, ScreenCaptureService::class.java))
        finish()
    }

    private fun endCall() {
        breadcrumb("endCall (user tapped hang up)")
        finishCall(notifyBackend = true)
    }

    override fun onDestroy() {
        breadcrumb("CallActivity.onDestroy isFinishing=$isFinishing isChangingConfigurations=$isChangingConfigurations")
        stopTimer()
        ringTimeoutJob?.cancel()
        room?.disconnect()
        super.onDestroy()
    }

    // ---------- UI qurish ----------

    private fun buildUi() {
        // Web (CallOverlay.tsx) bilan bir xil — quyuq qora fon.
        val root = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }

        remoteVideoContainer = FrameLayout(this)
        root.addView(remoteVideoContainer, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

        // Video oqim boshlanganda ko'rinadigan kichik yuqori "chip" (ism + vaqt)
        topBadgeText = TextView(this).apply {
            setTextColor(Color.WHITE)
            textSize = 15f
        }
        topBadge = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                cornerRadius = dp(20).toFloat()
                setColor(0x66000000)
            }
            setPadding(dp(16), dp(8), dp(16), dp(8))
            visibility = View.GONE
            addView(topBadgeText)
        }
        root.addView(
            topBadge,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.CENTER_HORIZONTAL).apply {
                topMargin = dp(56)
            },
        )

        // Markazdagi avatar + ism + holat/vaqt bloki
        centerOverlay = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
        }
        val avatarSize = dp(150)
        val avatarFrame = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(avatarSize, avatarSize)
            // MUHIM: faqat bitmap'ni doiraviy "qirqish" (CallAvatar'dagi
            // manual mask) ba'zi qurilmalarda to'liq ishlamasligi mumkin —
            // View DARAJASIDAGI oval clip (hardware-accelerated,
            // clipToOutline) rasmning HAR DOIM to'rtburchak EMAS, aniq
            // doira ko'rinishida chiqishini kafolatlaydi.
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setOval(0, 0, view.width, view.height)
                }
            }
            clipToOutline = true
        }
        avatarInitialsView = TextView(this).apply {
            gravity = Gravity.CENTER
            textSize = 56f
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(CallAvatar.colorFor(peerName))
            }
        }
        avatarPhotoView = ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            visibility = View.GONE
        }
        avatarFrame.addView(avatarInitialsView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        avatarFrame.addView(avatarPhotoView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        centerOverlay.addView(avatarFrame)

        nameView = TextView(this).apply {
            text = peerName
            setTextColor(Color.WHITE)
            textSize = 26f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(dp(24), dp(24), dp(24), 0)
        }
        centerOverlay.addView(nameView)

        // Qarindoshlik belgisi ("Aka", "Ona", ...) — Shajara doskasida
        // ko'rsatilgan bilan bir xil, kim qo'ng'iroq qilyapganini aniq
        // bilish uchun.
        relationView = TextView(this).apply {
            setTextColor(0xCCFFFFFF.toInt())
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(0, dp(2), 0, 0)
            visibility = View.GONE
        }
        centerOverlay.addView(relationView)

        statusText = TextView(this).apply {
            setTextColor(0xB3FFFFFF.toInt())
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, dp(8), 0, 0)
        }
        centerOverlay.addView(statusText)

        root.addView(centerOverlay, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER))

        // Pastki boshqaruv qatori: mikrofon / kamera / ekran ulashish (kulrang,
        // shaffof yumaloq tugmalar) + Qizil (Yakunlash) tugmasi. Faqat boshqa
        // tomon xonaga qo'shilgach ko'rinadi (updateConnectionStatus orqali) —
        // shundan oldin faqat bekor qilish tugmasi kifoya.
        controlsRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            visibility = View.GONE
        }
        controlsRow.addView(secondaryButton(R.drawable.ic_mic) { toggleMic() })
        controlsRow.addView(View(this).apply { layoutParams = LinearLayout.LayoutParams(dp(24), 1) })
        if (isVideo) {
            controlsRow.addView(secondaryButton(R.drawable.ic_videocam) { toggleCamera() })
            controlsRow.addView(View(this).apply { layoutParams = LinearLayout.LayoutParams(dp(24), 1) })
        }
        controlsRow.addView(secondaryButton(R.drawable.ic_screen_share) { toggleScreenShare() })
        controlsRow.addView(View(this).apply { layoutParams = LinearLayout.LayoutParams(dp(24), 1) })
        controlsRow.addView(endCallButton())

        // Faqat Qizil (bekor qilish) tugmasi — hali hech kim qo'shilmagan
        // paytda (chaqirilyapti/kutilmoqda) ko'rinadi.
        val cancelOnlyRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            addView(endCallButton())
        }

        val bottomContainer = FrameLayout(this)
        bottomContainer.addView(cancelOnlyRow)
        bottomContainer.addView(controlsRow)
        root.addView(
            bottomContainer,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL,
            ).apply { bottomMargin = dp(72) },
        )
        // controlsRow ko'rinishga kelganda cancelOnlyRow'ni yashirish —
        // updateConnectionStatus() shu ikkalasini boshqaradi.
        controlsRowVisibilityBridge = { visible ->
            cancelOnlyRow.visibility = if (visible) View.GONE else View.VISIBLE
        }

        setContentView(root)
    }

    private var controlsRowVisibilityBridge: ((Boolean) -> Unit)? = null

    private fun refreshControlIcons() {
        // Hozircha faqat funksional holat (yoqilgan/o'chirilgan) saqlanadi —
        // vizual bosilgan/bosilmagan farqi keyingi bosqichda ranglar bilan
        // kengaytirilishi mumkin.
    }

    private fun secondaryButton(iconRes: Int, onClick: () -> Unit): FrameLayout {
        val size = dp(56)
        val circle = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(size, size)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(0x33FFFFFF)
            }
            isClickable = true
            isFocusable = true
            setOnClickListener { onClick() }
        }
        val icon = ImageView(this).apply {
            setImageResource(iconRes)
            setColorFilter(Color.WHITE)
        }
        val iconSize = dp(24)
        circle.addView(icon, FrameLayout.LayoutParams(iconSize, iconSize, Gravity.CENTER))
        return circle
    }

    private fun endCallButton(): FrameLayout {
        val size = dp(64)
        val circle = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(size, size)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(0xFFFF3B30.toInt())
            }
            isClickable = true
            isFocusable = true
            setOnClickListener { endCall() }
        }
        val icon = ImageView(this).apply {
            setImageResource(R.drawable.ic_call)
            setColorFilter(Color.WHITE)
            rotation = 135f
        }
        val iconSize = dp(26)
        circle.addView(icon, FrameLayout.LayoutParams(iconSize, iconSize, Gravity.CENTER))
        return circle
    }
}
