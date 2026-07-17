package uz.ajdo.shajara.calls

import android.Manifest
import android.app.Activity
import android.app.PictureInPictureParams
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Outline
import android.graphics.drawable.GradientDrawable
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Rational
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.firebase.crashlytics.FirebaseCrashlytics
import io.livekit.android.renderer.TextureViewRenderer
import io.livekit.android.room.track.VideoTrack
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import uz.ajdo.shajara.R

/**
 * To'liq native (WebView emas) qo'ng'iroq ekrani — LiveKit ulanishining
 * O'ZI CallService'da yashaydi (bu Activity — shunchaki UI qatlami, unga
 * BOG'LANADI). Shu bilan foydalanuvchi Uy tugmasini bossa, boshqa sahifaga
 * o'tsa yoki Recents'dan surib tashlasa ham, qo'ng'iroq FAQAT Qizil tugma
 * bosilganda tugaydi — Activity yo'q qilinganda EMAS.
 *
 * Ikkita boshlanish yo'li bor:
 *  - CHIQUVCHI: CallPlugin.startCall() shu Activity'ni EXTRA_OUTGOING=true
 *    bilan ochadi, xizmat o'zi /calls/invite so'raydi (CallsHttp).
 *  - KIRUVCHI: IncomingCallActivity foydalanuvchi "Qabul qilish"ni
 *    bosgandan KEYIN (/calls/accept allaqachon so'ralgan) shu Activity'ni
 *    tayyor roomName/token/livekitUrl bilan ochadi.
 *
 * UI — Telegram/Apple uslubidagi qo'ng'iroq ekrani: markazda boshqa
 * tomonning avatari (rasm yoki ism bosh harfi) + ismi + holat/vaqt
 * hisoblagichi, video qo'ng'iroqda mening kamerам suhbatdosh hali
 * qo'shilmagan bo'lsa TO'LIQ EKRAN, qo'shilgach kichik burchakdagi oynaga
 * ("PiP") almashadi. Pastda: boshqaruv ikonkalari bir qatorda, Qizil
 * (Yakunlash) tugmasi ALOHIDA qatorda, prominent.
 */
class CallActivity : AppCompatActivity(), CallService.Listener {
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
    }

    private var callService: CallService? = null
    private var bound = false
    private var localVideoRenderer: TextureViewRenderer? = null
    private var remoteVideoRenderer: TextureViewRenderer? = null

    private lateinit var remoteVideoContainer: FrameLayout
    private lateinit var localVideoContainer: FrameLayout
    private lateinit var centerOverlay: LinearLayout
    private lateinit var avatarPhotoView: ImageView
    private lateinit var avatarInitialsView: TextView
    private lateinit var nameView: TextView
    private lateinit var relationView: TextView
    private lateinit var statusText: TextView
    private lateinit var topBadge: LinearLayout
    private lateinit var topBadgeText: TextView
    private lateinit var remoteStatusRow: LinearLayout
    private lateinit var remoteCameraOffBadge: TextView
    private lateinit var remoteMicOffBadge: TextView
    private lateinit var controlsRow: LinearLayout
    private lateinit var controlsColumn: LinearLayout
    private lateinit var minimizeButton: FrameLayout
    private lateinit var micButton: ToggleButton
    private var cameraButton: ToggleButton? = null
    private lateinit var speakerButton: ToggleButton
    private lateinit var screenShareButton: ToggleButton
    private var isInPip = false
    private var chromeHidden = false
    private var hideChromeJob: Job? = null
    private var localPreviewDragged = false

    /** Kamera almashtirish (tap-to-swap, FaceTime/Zoom uslubi): TRUE bo'lsa
     * MAHALLIY video "katta" (fon) rolda, suhbatdoshniki kichik burchak-
     * qutida — aks holda (standart, FALSE) teskari. Konteynerlarning O'ZI
     * (remoteVideoContainer/localVideoContainer) va ularning ICHIDAGI
     * renderer'lar HECH QACHON qayta ota-onalanmaydi — faqat QAYSI
     * konteynerga "katta"/"kichik" LayoutParams berilishi shu bayroqqa
     * qarab belgilanadi (bigContainer()/smallContainer()). */
    private var localIsMain = false

    private fun bigContainer(): FrameLayout = if (localIsMain) localVideoContainer else remoteVideoContainer
    private fun smallContainer(): FrameLayout = if (localIsMain) remoteVideoContainer else localVideoContainer

    /** Kichik burchak-qutiga bosilganda (sudrash EMAS) — katta/kichik
     * tasvir o'rin almashadi. Yangi kichik quti STANDART burchakdan
     * boshlaydi (eski qutining qo'lda surilgan joyi endi mos emas). */
    private fun swapMainCamera() {
        localIsMain = !localIsMain
        localPreviewDragged = false
        val svc = callService
        updateVideoLayout(remoteVideoContainer.childCount > 0, svc?.hadRemotePeer ?: false)
    }

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            val svc = (binder as CallService.LocalBinder).service()
            callService = svc
            svc.setListener(this@CallActivity)
            maybeStartFreshCall(svc)
            onCallStateChanged()
            attachRenderers(svc)
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            callService?.setListener(null)
            callService = null
        }
    }

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
                callService?.startScreenShare(data)
            }
        }

    // Mikrofon/kamera RUNTIME ruxsati (Android 6.0+) manifestda e'lon
    // qilingani bilan yetarli emas — so'ralmasa, LiveKit SDK'ning audio/video
    // olish kodi (WebRTC, alohida native/thread ustida) tutilmagan
    // SecurityException tashlab, BUTUN ilovani krash qiladi.
    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { _ ->
            if (hasRequiredPermissions()) {
                bindToService()
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
        breadcrumb("CallActivity.onCreate outgoing=${intent.getBooleanExtra(EXTRA_OUTGOING, false)} type=${intent.getStringExtra(EXTRA_CALL_TYPE)} resuming=${CallService.isRunning}")
        buildUi()
        prefillFromIntent()
        if (CallService.isRunning || hasRequiredPermissions()) {
            bindToService()
        } else {
            val isVideo = intent.getStringExtra(EXTRA_CALL_TYPE) == "VIDEO"
            val needed = mutableListOf(Manifest.permission.RECORD_AUDIO)
            if (isVideo) needed.add(Manifest.permission.CAMERA)
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    // launchMode="singleTask" — agar shu Activity'ning eski nusxasi hali
    // tirik bo'lsa, Android YANGI onCreate() chaqirmaydi, yangi Intent'ni
    // shu yerga yuboradi. CallService allaqachon ISHLAYOTGAN bo'lsa (xuddi
    // shu qo'ng'iroq davom etayotgan bo'lsa — masalan bildirishnoma orqali
    // qaytilganda) YANGI invite/accept YUBORILMAYDI, faqat UI qayta
    // ko'rsatiladi. Aks holda (haqiqatan YANGI qo'ng'iroq — eskisi
    // allaqachon tugagan) eski xizmat/renderer'lar tozalanib, yangisi
    // boshlanadi.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        breadcrumb("CallActivity.onNewIntent outgoing=${intent.getBooleanExtra(EXTRA_OUTGOING, false)}")
        val incomingCallId = intent.getStringExtra(EXTRA_CALL_ID)
        val isFreshCallRequest = intent.getBooleanExtra(EXTRA_OUTGOING, false) || intent.getStringExtra(EXTRA_TOKEN) != null
        val sameOngoingCall = CallService.isRunning && callService?.callId != null && callService?.callId == incomingCallId
        setIntent(intent)
        if (isFreshCallRequest && !sameOngoingCall) {
            // Eski qo'ng'iroq hali tugamagan bo'lsa (kutilmagan holat) —
            // avval uni tugatamiz, keyin yangisini boshlaymiz.
            if (CallService.isRunning) callService?.endCall(notifyBackend = true)
            detachRenderers()
            if (bound) {
                unbindService(connection)
                bound = false
            }
            callService = null
            localPreviewDragged = false
            chromeHidden = false
            hideChromeJob?.cancel()
            hideChromeJob = null
            buildUi()
            prefillFromIntent()
            if (hasRequiredPermissions()) {
                bindToService()
            } else {
                val isVideo = intent.getStringExtra(EXTRA_CALL_TYPE) == "VIDEO"
                val needed = mutableListOf(Manifest.permission.RECORD_AUDIO)
                if (isVideo) needed.add(Manifest.permission.CAMERA)
                permissionLauncher.launch(needed.toTypedArray())
            }
        } else {
            prefillFromIntent()
            onCallStateChanged()
        }
    }

    private fun hasRequiredPermissions(): Boolean {
        val isVideo = intent.getStringExtra(EXTRA_CALL_TYPE) == "VIDEO"
        val micGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        val camGranted = !isVideo || ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        return micGranted && camGranted
    }

    /** Ism/rasm/qarindoshlik — server javobini kutmasdan darhol ko'rsatish
     * uchun (JS/IncomingCallActivity intent orqali beradi). CallService
     * ulanganda ham qayta o'qib chiqadi (agar allaqachon boshqa qiymat
     * saqlagan bo'lsa — masalan xizmat qayta bog'langanda). */
    private fun prefillFromIntent() {
        val peerName = intent.getStringExtra(EXTRA_PEER_NAME) ?: "AJDO"
        val peerPhotoUrl = intent.getStringExtra(EXTRA_PEER_PHOTO_URL)
        val peerRelation = intent.getStringExtra(EXTRA_PEER_RELATION)
        nameView.text = peerName
        relationView.text = peerRelation
        relationView.visibility = if (peerRelation.isNullOrBlank()) View.GONE else View.VISIBLE
        CallAvatar.bind(avatarPhotoView, avatarInitialsView, peerName, peerPhotoUrl)
    }

    private fun bindToService() {
        if (bound) return
        val isVideo = intent.getStringExtra(EXTRA_CALL_TYPE) == "VIDEO"
        val svcIntent = CallService.startIntent(this, isVideo)
        if (!CallService.isRunning) startForegroundService(svcIntent)
        bindService(svcIntent, connection, Context.BIND_AUTO_CREATE)
        bound = true
    }

    private fun maybeStartFreshCall(svc: CallService) {
        if (CallService.isRunning && svc.callId != null) return // allaqachon boshlangan — qayta bog'lanish
        val callId = intent.getStringExtra(EXTRA_CALL_ID)
        val peerName = intent.getStringExtra(EXTRA_PEER_NAME) ?: "AJDO"
        val peerPhotoUrl = intent.getStringExtra(EXTRA_PEER_PHOTO_URL)
        val peerRelation = intent.getStringExtra(EXTRA_PEER_RELATION)
        if (intent.getBooleanExtra(EXTRA_OUTGOING, false)) {
            val calleeId = intent.getStringExtra(EXTRA_CALLEE_ID)
            val type = intent.getStringExtra(EXTRA_CALL_TYPE) ?: "AUDIO"
            if (calleeId == null) {
                finish()
                return
            }
            svc.startOutgoing(calleeId, type, peerName, peerPhotoUrl, peerRelation)
        } else {
            val token = intent.getStringExtra(EXTRA_TOKEN)
            val livekitUrl = intent.getStringExtra(EXTRA_LIVEKIT_URL)
            val type = intent.getStringExtra(EXTRA_CALL_TYPE) ?: "AUDIO"
            if (callId != null && token != null && livekitUrl != null) {
                svc.startAccepted(callId, type, token, livekitUrl, peerName, peerPhotoUrl, peerRelation)
            } else if (svc.callId == null) {
                finish()
            }
        }
    }

    // Activity ko'rinadigan bo'lganda (dastlabki ochilish, yoki foydalanuvchi
    // Uy tugmasidan/boshqa sahifadan QAYTGANDA) qayta bog'lanadi — xizmat bu
    // orada TIRIK qolgan (startForegroundService bilan boshlangan, Activity
    // umriga bog'liq emas), shu bois faqat UI qayta ulanadi, YANGI
    // invite/accept YUBORILMAYDI (bindToService/maybeStartFreshCall shuni
    // o'zi ichida tekshiradi).
    override fun onStart() {
        super.onStart()
        if (!bound && (CallService.isRunning || hasRequiredPermissions())) {
            bindToService()
        }
    }

    // MUHIM: unbind qilish xizmatni O'ZI TO'XTATMAYDI (u startForegroundService
    // bilan boshlangan, faqat bind emas) — u fonda ishlashda davom etadi
    // (shu — foydalanuvchi Uy tugmasini bossa yoki boshqa sahifaga o'tsa
    // ham qo'ng'iroq FAQAT Qizil tugma bosilganda tugashining sababi), biz
    // shunchaki UI'ni "eshitish"ni to'xtatamiz (renderer'lar View umriga
    // bog'liq bo'lgani uchun ular albatta uzilishi kerak).
    override fun onStop() {
        detachRenderers()
        if (bound) {
            callService?.setListener(null)
            unbindService(connection)
            bound = false
        }
        super.onStop()
    }

    override fun onCallStateChanged() {
        val svc = callService ?: return
        statusText.text = svc.statusLabel
        topBadgeText.text = "${svc.peerName} · ${svc.statusLabel}"
        val remoteActive = remoteVideoContainer.childCount > 0
        // MUHIM: agar to'liq ekran video YO'QOLSA (masalan suhbatdosh
        // kamерasini o'chirsa) — tugmalar YASHIRIN holatda "qulflanib"
        // qolmasligi kerak (bosish uchun video yo'q, ekranga tegish
        // ishlamaydi). Shu holatda avtomatik qayta ko'rsatiladi.
        if (!remoteActive && chromeHidden) {
            chromeHidden = false
            hideChromeJob?.cancel()
            hideChromeJob = null
        }
        if (::micButton.isInitialized) setToggleState(micButton, svc.micMuted, R.drawable.ic_mic_off, R.drawable.ic_mic)
        cameraButton?.let { setToggleState(it, svc.cameraOff, R.drawable.ic_videocam_off, R.drawable.ic_videocam) }
        if (::speakerButton.isInitialized) setToggleState(speakerButton, svc.speakerOn, R.drawable.ic_volume_up, R.drawable.ic_volume_up)
        if (::screenShareButton.isInitialized) setToggleState(screenShareButton, svc.screenSharing, R.drawable.ic_screen_share, R.drawable.ic_screen_share)
        if (svc.isVideo && !svc.cameraOff) {
            attachLocalPreview(svc)
        } else {
            // Kamera o'chirilgan — eski (muzlab qolgan) kadr ko'rinib
            // qolmasligi uchun mening kamерамning ko'rinishi darhol
            // yopiladi (LocalVideoTrack o'zi allaqachon o'chirilgan/
            // unpublish qilingan, faqat renderer View'ini tozalash qoladi).
            detachLocalPreview()
        }
        // Suhbatdoshning kamera/mikrofon holati — Zoom/Telegram uslubidagi
        // "Kamera o'chirilgan"/"Mikrofon o'chirilgan" belgilari (faqat
        // haqiqiy suhbatdosh bo'lganda ma'noli). PiP oynasida ham
        // ko'rinishda qoladi — applyPipLayout() buni yashirmaydi.
        remoteCameraOffBadge.visibility = if (svc.hadRemotePeer && svc.remoteCameraOff) View.VISIBLE else View.GONE
        remoteMicOffBadge.visibility = if (svc.hadRemotePeer && svc.remoteMicMuted) View.VISIBLE else View.GONE
        remoteStatusRow.visibility = if (remoteCameraOffBadge.visibility == View.VISIBLE || remoteMicOffBadge.visibility == View.VISIBLE) View.VISIBLE else View.GONE
        updateVideoLayout(remoteActive, svc.hadRemotePeer)
        refreshChromeVisibility(svc)
        if (remoteActive) scheduleAutoHideChrome()
        updatePipParams()
    }

    /** Boshqaruv tugmalari (mikrofon/kamera/gromkogovoritel/ekran ulashish/
     * Yakunlash, ism-badge, kichraytirish tugmasi) ko'rinishini joriy
     * holatga (chromeHidden) qarab qo'llaydi — bu updateVideoLayout()dan
     * ALOHIDA, chunki chromeHidden 3 soniyalik avtomatik yashirishga
     * bog'liq, video holatiga emas. */
    private fun refreshChromeVisibility(svc: CallService) {
        if (isInPip) return
        if (chromeHidden) {
            controlsColumn.visibility = View.GONE
            topBadge.visibility = View.GONE
            minimizeButton.visibility = View.GONE
        } else {
            controlsColumn.visibility = View.VISIBLE
            controlsRow.visibility = if (svc.hadRemotePeer) View.VISIBLE else View.GONE
            minimizeButton.visibility = if (svc.isVideo) View.VISIBLE else View.GONE
            // topBadge'ning o'zi ko'rinishi kerakmi — updateVideoLayout()
            // allaqachon video holatiga qarab to'g'ri o'rnatgan, shu bois
            // bu yerda qayta tegilmaydi.
        }
    }

    /** Ekranga (video maydoniga) tegilganda — boshqaruv tugmalari yashirin
     * bo'lsa qayta ko'rsatiladi, keyin yana 3 soniyalik hisoblagich
     * qaytadan boshlanadi (YouTube/Telegram video pleer uslubi). */
    private fun onScreenTapped() {
        if (isInPip || remoteVideoContainer.childCount == 0) return
        hideChromeJob?.cancel()
        hideChromeJob = null
        if (chromeHidden) {
            chromeHidden = false
            callService?.let { refreshChromeVisibility(it) }
        }
        scheduleAutoHideChrome()
    }

    /** 3 soniya ekranga tegilmasa — boshqaruv tugmalari/ism-badge/
     * kichraytirish tugmasi berkitiladi, faqat video (yoki avatar) qoladi.
     * FAQAT suhbatdoshning videosi to'liq ekranda bo'lganda ma'noli
     * (audio qo'ng'iroqda yoki kutish holatida tugmalar doim ko'rinadi). */
    private fun scheduleAutoHideChrome() {
        if (hideChromeJob != null || chromeHidden || isInPip) return
        if (remoteVideoContainer.childCount == 0) return
        hideChromeJob = lifecycleScope.launch {
            delay(3000)
            hideChromeJob = null
            chromeHidden = true
            controlsColumn.visibility = View.GONE
            topBadge.visibility = View.GONE
            minimizeButton.visibility = View.GONE
        }
    }

    override fun onRemoteVideoTrack(track: VideoTrack?) {
        val svc = callService ?: return
        remoteVideoRenderer?.let { renderer ->
            remoteVideoContainer.removeView(renderer)
        }
        remoteVideoRenderer = null
        remoteVideoContainer.removeAllViews()
        if (track != null) {
            val renderer = TextureViewRenderer(this)
            svc.initVideoRenderer(renderer)
            track.addRenderer(renderer)
            remoteVideoRenderer = renderer
            remoteVideoContainer.addView(renderer, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        }
        updateVideoLayout(track != null, svc.hadRemotePeer)
        if (track != null) {
            scheduleAutoHideChrome()
        } else if (chromeHidden) {
            // Video yo'qoldi (masalan suhbatdosh kamерasini o'chirdi) —
            // tugmalar berkitilgan holatda "qulflanib" qolmasligi kerak.
            chromeHidden = false
            hideChromeJob?.cancel()
            hideChromeJob = null
            refreshChromeVisibility(svc)
        }
    }

    override fun onCallEnded() {
        breadcrumb("CallActivity.onCallEnded -> finish()")
        finish()
    }

    private fun attachRenderers(svc: CallService) {
        val remoteTrack = svc.currentRemoteVideoTrack()
        if (remoteTrack != null) onRemoteVideoTrack(remoteTrack)
        if (svc.isVideo && !svc.cameraOff) attachLocalPreview(svc)
        updateVideoLayout(remoteTrack != null, svc.hadRemotePeer)
    }

    private fun attachLocalPreview(svc: CallService) {
        if (localVideoRenderer != null) return
        val track = svc.localVideoTrack() ?: return
        try {
            val renderer = TextureViewRenderer(this)
            svc.initVideoRenderer(renderer)
            renderer.setMirror(true)
            track.addRenderer(renderer)
            localVideoRenderer = renderer
            localVideoContainer.removeAllViews()
            localVideoContainer.addView(renderer, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        } catch (e: Exception) {
            breadcrumb("attachLocalPreview FAILED: ${e.message}")
            FirebaseCrashlytics.getInstance().recordException(e)
        }
    }

    private fun detachLocalPreview() {
        if (localVideoRenderer == null) return
        localVideoRenderer = null
        localVideoContainer.removeAllViews()
    }

    private fun detachRenderers() {
        detachLocalPreview()
        remoteVideoRenderer = null
        remoteVideoContainer.removeAllViews()
    }

    /** Video joylashuvi:
     *  - hali hech kim yo'q, lekin MENING kamерам ishlayapti — TO'LIQ EKRAN
     *    (Telegram/Apple "kutish" holati);
     *  - suhbatdosh BOR va uning videosi ham bor — u to'liq ekran, meniki
     *    kichik burchakdagi oynaga ("PiP") almashadi;
     *  - suhbatdosh BOR, lekin kamераsi o'chiq — o'RTADA uning (mening
     *    EMAS) avatari/ismi ko'rsatiladi (centerOverlay allaqachon
     *    prefillFromIntent() orqali suhbatdosh ma'lumoti bilan to'ldirilgan). */
    private fun updateVideoLayout(remoteActive: Boolean, hadRemotePeer: Boolean) {
        if (isInPip) return // PiP rejimida applyPipLayout() alohida boshqaradi
        val hasLocal = localVideoContainer.childCount > 0
        when {
            remoteActive -> {
                // Kamera almashtirish (tap-to-swap) FAQAT shu holatda ma'noli
                // — ikkala tomon ham (suhbatdoshning videosi + mening
                // kamерам) bir vaqtda ko'rinib turganda. "Katta" (fon) va
                // "kichik" (burchak) rollarni localIsMain belgilaydi.
                val big = bigContainer()
                val small = smallContainer()
                val smallHasContent = if (localIsMain) remoteActive else hasLocal
                // MUHIM: agar foydalanuvchi kichik oynani allaqachon qo'lda
                // surib qo'ygan bo'lsa (localPreviewDragged), uning
                // joylashuvini QAYTA STANDART BURCHAKKA tashlab yubormaymiz
                // — faqat o'lchamini (110x150dp) to'g'rilaymiz, joyi saqlanadi.
                if (!localPreviewDragged) {
                    small.layoutParams = FrameLayout.LayoutParams(dp(110), dp(150), Gravity.TOP or Gravity.END).apply {
                        topMargin = dp(40)
                        rightMargin = dp(16)
                    }
                } else {
                    val lp = small.layoutParams
                    if (lp == null || lp.width != dp(110) || lp.height != dp(150)) {
                        small.layoutParams = FrameLayout.LayoutParams(dp(110), dp(150))
                    }
                }
                big.layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                big.visibility = View.VISIBLE
                small.visibility = if (smallHasContent) View.VISIBLE else View.GONE
                centerOverlay.visibility = View.GONE
                topBadge.visibility = View.VISIBLE
            }
            hadRemotePeer -> {
                // Suhbatdosh ulangan, lekin video yo'q (kamераsi o'chiq) —
                // MENING to'liq ekran preview'im emas, SUHBATDOSHNING
                // avatari ko'rinishi kerak. Almashtirish bu holatda mavjud
                // emas (kichik quti ko'rinmaydi) — standart holatga qaytamiz.
                localIsMain = false
                localVideoContainer.visibility = View.GONE
                centerOverlay.visibility = View.VISIBLE
                topBadge.visibility = View.VISIBLE
            }
            hasLocal -> {
                localIsMain = false
                localPreviewDragged = false // yangi qo'ng'iroq/holat — surish qayta standart holatdan boshlanadi
                localVideoContainer.layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                localVideoContainer.visibility = View.VISIBLE
                centerOverlay.visibility = View.GONE
                topBadge.visibility = View.VISIBLE
            }
            else -> {
                localIsMain = false
                localVideoContainer.visibility = View.GONE
                centerOverlay.visibility = View.VISIBLE
                topBadge.visibility = View.GONE
            }
        }
    }

    /** Video qo'ng'iroqda kichik burchak-oynani (PiP holatida) istalgan
     * nuqtaga surish + unga bosilganda (sudrash EMAS) katta/kichik tasvir
     * o'RIN ALMASHTIRISH uchun — Telegram/FaceTime uslubi. IKKALA
     * konteynerga ham (remoteVideoContainer VA localVideoContainer)
     * biriktiriladi — chunki kamera almashtirilgach QAYSI BIRI "kichik"
     * ekanligi o'zgaradi; har biri o'zi HOZIR kichik rolda ekanligini
     * `smallContainer() === v` orqali tekshirib, aks holda hech narsa
     * qilmaydi (katta konteynerda sudrash/bosish ma'nosiz). */
    private fun makeSmallBoxInteractive(view: FrameLayout) {
        var downRawX = 0f
        var downRawY = 0f
        var startX = 0f
        var startY = 0f
        var dragging = false
        view.setOnTouchListener { v, event ->
            if (smallContainer() !== v) return@setOnTouchListener false
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downRawX = event.rawX
                    downRawY = event.rawY
                    startX = v.x
                    startY = v.y
                    dragging = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - downRawX
                    val dy = event.rawY - downRawY
                    if (!dragging && (kotlin.math.abs(dx) > dp(6) || kotlin.math.abs(dy) > dp(6))) dragging = true
                    if (dragging) {
                        val parent = v.parent as View
                        val maxX = (parent.width - v.width).coerceAtLeast(0).toFloat()
                        val maxY = (parent.height - v.height).coerceAtLeast(0).toFloat()
                        v.x = (startX + dx).coerceIn(0f, maxX)
                        v.y = (startY + dy).coerceIn(0f, maxY)
                        localPreviewDragged = true
                    }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    if (!dragging) {
                        v.performClick()
                        swapMainCamera()
                    }
                    true
                }
                else -> false
            }
        }
    }

    // ---------- Picture-in-Picture (Telegram uslubida, ilovadan chiqilganda) ----------

    private fun canUsePip(): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_PICTURE_IN_PICTURE)

    private fun updatePipParams() {
        if (!canUsePip()) return
        val svc = callService ?: return
        if (!svc.isVideo) return
        try {
            setPictureInPictureParams(
                PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(9, 16))
                    .build(),
            )
        } catch (_: Exception) {
        }
    }

    /** Foydalanuvchi Uy tugmasini bossa yoki boshqa ilovaga o'tsa (Orqaga
     * tugmasi EMAS — faqat shu) chaqiriladi. Video qo'ng'iroq faol bo'lsa,
     * Telegram uslubida avtomatik kichik suzuvchi oynaga ("PiP") o'tadi —
     * qo'ng'iroq davom etadi, foydalanuvchi butun qurilma bo'ylab (boshqa
     * ilovalar ustida) uni ko'radi va istalgan joyga surishi mumkin (buni
     * Android tizimining o'zi boshqaradi — qo'shimcha kod shart emas). */
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        val svc = callService
        if (canUsePip() && svc != null && svc.isVideo && (svc.hadRemotePeer || localVideoContainer.childCount > 0)) {
            enterPip()
        }
    }

    /** MUHIM (qurilmadan-qurilmaga farq qiladigan xato): ba'zi qurilmalarda
     * (ayniqsa Xiaomi/MIUI, ba'zi Samsung sozlamalarida) Picture-in-Picture
     * OS DARAJASIDA qo'llab-quvvatlansa ham ("hasSystemFeature" TRUE),
     * HAR BIR ilova uchun ALOHIDA, foydalanuvchi qo'lda yoqishi kerak
     * bo'lgan ruxsat bor (Sozlamalar > Ilovalar > AJDO > Kichik oyna).
     * Shu SABABDAN bitta foydalanuvchida ishlab, ikkinchisida ishlamasligi
     * mumkin — dasturiy jihatdan buni oldindan bilib bo'lmaydi, faqat
     * enterPictureInPictureMode()ning O'ZI false qaytarganda aniqlanadi.
     * Shu holatda foydalanuvchiga ANIQ nima qilish kerakligini
     * tushuntiramiz (YECHIM: Sozlamalardan ruxsatni yoqish). */
    private fun enterPip() {
        if (!canUsePip()) return
        try {
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(9, 16))
                .build()
            val entered = enterPictureInPictureMode(params)
            if (!entered) {
                breadcrumb("enterPip: system declined (PiP permission likely disabled for this app)")
                Toast.makeText(
                    this,
                    "Kichik oyna ishlamadi. Sozlamalar > Ilovalar > AJDO > \"Kichik oyna\" (Picture-in-Picture) ruxsatini yoqing.",
                    Toast.LENGTH_LONG,
                ).show()
            }
        } catch (e: Exception) {
            breadcrumb("enterPip FAILED: ${e.message}")
            Toast.makeText(
                this,
                "Kichik oyna ishlamadi. Sozlamalar > Ilovalar > AJDO > \"Kichik oyna\" (Picture-in-Picture) ruxsatini yoqing.",
                Toast.LENGTH_LONG,
            ).show()
        }
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        isInPip = isInPictureInPictureMode
        applyPipLayout(isInPictureInPictureMode)
    }

    /** PiP oynasiga kirganda ekran juda kichik bo'ladi — foydalanuvchi
     * kamera almashtirib "o'zini katta" qilib qo'ygan bo'lsa, tizim PiP
     * oynasi ham O'SHANI ko'rsatishi kerak (aks holda foydalanuvchi
     * "katta" qilib tanlagan tasvir PiP'ga kirganda kutilmaganda
     * g'oyib bo'lardi) — shu bois bigContainer()/smallContainer() orqali,
     * standart holatda (localIsMain=false) bu SUHBATDOSH bo'ladi. Boshqaruv
     * tugmalari/ism-badge/kichraytirish tugmasi kichik oynada o'qib
     * bo'lmaydigan holga kelgani uchun yashiriladi — Android o'zi PiP
     * oynasi ustida tizim tugmalari (kengaytirish/yopish)ni chizadi. */
    private fun applyPipLayout(inPip: Boolean) {
        if (inPip) {
            hideChromeJob?.cancel()
            hideChromeJob = null
            controlsColumn.visibility = View.GONE
            minimizeButton.visibility = View.GONE
            topBadge.visibility = View.GONE
            nameView.visibility = View.GONE
            relationView.visibility = View.GONE
            statusText.visibility = View.GONE
            val big = bigContainer()
            val small = smallContainer()
            small.visibility = View.GONE
            val bigHasVideo = big.childCount > 0
            big.visibility = if (bigHasVideo) View.VISIBLE else View.GONE
            centerOverlay.visibility = if (bigHasVideo) View.GONE else View.VISIBLE
        } else {
            // To'liq ekranga qaytilganda boshqaruv tugmalari/ism-badge
            // TOZA holatdan qayta ko'rsatiladi — PiP'dan oldin 3 soniyalik
            // avtomatik yashirish faol bo'lgan bo'lsa ham, endi qaytadan
            // ko'rinadi (foydalanuvchi ekranga tegib qayta ko'rsatishga
            // majbur bo'lmasin).
            chromeHidden = false
            nameView.visibility = View.VISIBLE
            relationView.visibility = if (relationView.text.isNullOrBlank()) View.GONE else View.VISIBLE
            statusText.visibility = View.VISIBLE
            val svc = callService
            updateVideoLayout(remoteVideoContainer.childCount > 0, svc?.hadRemotePeer ?: false)
            if (svc != null) {
                onCallStateChanged()
            } else {
                controlsColumn.visibility = View.VISIBLE
            }
        }
    }

    private fun endCall() {
        breadcrumb("endCall (user tapped hang up)")
        callService?.endCall(notifyBackend = true)
        finish()
    }

    // ---------- UI qurish ----------

    private fun buildUi() {
        // Web (CallOverlay.tsx) bilan bir xil — quyuq qora fon.
        val root = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }

        remoteVideoContainer = FrameLayout(this)
        root.addView(remoteVideoContainer, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

        // Mening kamерамning ko'rinishi — hali suhbatdosh yo'q bo'lsa TO'LIQ
        // EKRAN, suhbatdosh qo'shilgach yuqori-o'ng burchakdagi kichik
        // oyna ("PiP"), updateVideoLayout() orqali boshqariladi.
        localVideoContainer = FrameLayout(this).apply {
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    val radius = if (view.width >= resources.displayMetrics.widthPixels - dp(8)) 0f else dp(16).toFloat()
                    outline.setRoundRect(0, 0, view.width, view.height, radius)
                }
            }
            clipToOutline = true
            setBackgroundColor(0xFF1C1C1E.toInt())
            visibility = View.GONE
        }
        root.addView(
            localVideoContainer,
            FrameLayout.LayoutParams(dp(110), dp(150), Gravity.TOP or Gravity.END).apply {
                topMargin = dp(40)
                rightMargin = dp(16)
            },
        )
        makeSmallBoxInteractive(localVideoContainer)
        makeSmallBoxInteractive(remoteVideoContainer)

        // Video oqim boshlanganda ko'rinadigan yuqori "chip" (ism + holat/vaqt)
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
                topMargin = dp(40)
            },
        )

        // Suhbatdoshning kamera/mikrofon holati belgilari (Zoom/Telegram
        // uslubida) — yuqori qismda, topBadge'dan pastroqda. PiP oynasida
        // ham ko'rinishda qoladi (applyPipLayout() buni yashirmaydi).
        remoteCameraOffBadge = statusPill("Kamera o'chirilgan")
        remoteMicOffBadge = statusPill("Mikrofon o'chirilgan")
        remoteStatusRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            visibility = View.GONE
            addView(remoteCameraOffBadge)
            addView(View(this@CallActivity).apply { layoutParams = LinearLayout.LayoutParams(dp(8), 1) })
            addView(remoteMicOffBadge)
        }
        root.addView(
            remoteStatusRow,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.CENTER_HORIZONTAL).apply {
                topMargin = dp(88)
            },
        )

        // Kichraytirish (Picture-in-Picture) tugmasi — video qo'ng'iroqda
        // yuqori-chap burchakda, istalgan payt qo'lda kichik suzuvchi
        // oynaga o'tish uchun (Uy tugmasini kutmasdan, Telegram uslubi).
        minimizeButton = actionButton(R.drawable.ic_minimize) { enterPip() }.apply {
            visibility = View.GONE
        }
        root.addView(
            minimizeButton,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.START).apply {
                topMargin = dp(40)
                leftMargin = dp(16)
            },
        )

        // Markazdagi avatar + ism + holat/vaqt bloki (audio qo'ng'iroq yoki
        // video hali ulanmagan holat uchun)
        centerOverlay = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
        }
        val avatarSize = dp(150)
        val avatarFrame = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(avatarSize, avatarSize)
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
                setColor(CallAvatar.colorFor(intent.getStringExtra(EXTRA_PEER_NAME) ?: "AJDO"))
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
            setTextColor(Color.WHITE)
            textSize = 26f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(dp(24), dp(24), dp(24), 0)
        }
        centerOverlay.addView(nameView)

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

        // Pastki boshqaruv: YUQORIDA ikonkalar qatori (mikrofon/kamera/
        // kamera almashtirish/gromkogovoritel/ekran ulashish — faqat
        // suhbatdosh qo'shilgach ko'rinadi), PASTDA — Qizil (Yakunlash)
        // tugmasi ALOHIDA, har doim ko'rinadi (Telegram/Apple uslubi: bosh
        // boshqaruv tugmalari va yakunlash tugmasi vizual ajratilgan).
        val isVideo = intent.getStringExtra(EXTRA_CALL_TYPE) == "VIDEO"
        controlsRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            visibility = View.GONE
        }
        micButton = makeToggleButton(R.drawable.ic_mic) { callService?.toggleMic() }
        controlsRow.addView(micButton.circle)
        controlsRow.addView(spacer())
        if (isVideo) {
            val cam = makeToggleButton(R.drawable.ic_videocam) { callService?.toggleCamera() }
            cameraButton = cam
            controlsRow.addView(cam.circle)
            controlsRow.addView(spacer())
            controlsRow.addView(actionButton(R.drawable.ic_flip_camera) { callService?.switchCamera() })
            controlsRow.addView(spacer())
        }
        speakerButton = makeToggleButton(R.drawable.ic_volume_up) { callService?.toggleSpeaker() }
        controlsRow.addView(speakerButton.circle)
        controlsRow.addView(spacer())
        screenShareButton = makeToggleButton(R.drawable.ic_screen_share) { onScreenShareTapped() }
        controlsRow.addView(screenShareButton.circle)

        controlsColumn = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            // MUHIM: LinearLayout(VERTICAL).addView(child) — child uchun
            // ANIQ layoutParams berilmasa, Android child'ga sukut bo'yicha
            // width=MATCH_PARENT beradi (generateDefaultLayoutParams()).
            // controlsRow bunday holda controlsColumn'ning ENG TOR farzandi
            // (Qizil tugma, ~64dp) o'lchamiga siqilib qolardi — barcha
            // ikonkalar bir-birining USTIGA chiqib ketardi (faqat bittasi
            // ko'rinardi). ANIQ WRAP_CONTENT berish shu tsiklni buzadi.
            addView(controlsRow, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            addView(
                View(this@CallActivity).apply {
                    layoutParams = LinearLayout.LayoutParams(1, dp(28))
                },
            )
            addView(endCallButton())
        }
        root.addView(
            controlsColumn,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL,
            ).apply { bottomMargin = dp(56) },
        )

        // Ekranga tegilganda (video ustidan ham) boshqaruv tugmalari
        // yashirin bo'lsa qayta ko'rsatiladi (onScreenTapped()).
        root.isClickable = true
        root.setOnClickListener { onScreenTapped() }

        setContentView(root)
    }

    private fun onScreenShareTapped() {
        val svc = callService ?: return
        if (svc.screenSharing) {
            svc.stopScreenShare()
        } else {
            val manager = getSystemService(MediaProjectionManager::class.java)
            screenCaptureLauncher.launch(manager.createScreenCaptureIntent())
        }
    }

    /** Yumaloq boshqaruv tugmasi + uning ikonkasi — holatga qarab
     * keyinroq yangilanishi uchun ikkalasi ham saqlanadi. */
    private class ToggleButton(val circle: FrameLayout, val icon: ImageView)

    private fun makeToggleButton(iconRes: Int, onClick: () -> Unit): ToggleButton {
        val size = dp(52)
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
        val iconSize = dp(22)
        circle.addView(icon, FrameLayout.LayoutParams(iconSize, iconSize, Gravity.CENTER))
        return ToggleButton(circle, icon)
    }

    /** Holatsiz (faqat bosiladigan) tugma — masalan kamera almashtirish,
     * har doim bir xil ko'rinishda turadi. */
    private fun actionButton(iconRes: Int, onClick: () -> Unit): FrameLayout {
        val size = dp(52)
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
        val iconSize = dp(22)
        circle.addView(icon, FrameLayout.LayoutParams(iconSize, iconSize, Gravity.CENTER))
        return circle
    }

    /** Tugma holatini (yoqilgan/o'chirilgan) vizual ko'rsatadi — active
     * bo'lsa OQ fon + qora ikonka (Apple/Telegram uslubidagi "band" tugma
     * ko'rinishi), aks holda shaffof fon + oq ikonka. */
    private fun setToggleState(button: ToggleButton, active: Boolean, activeIconRes: Int, inactiveIconRes: Int) {
        button.icon.setImageResource(if (active) activeIconRes else inactiveIconRes)
        button.icon.setColorFilter(if (active) Color.BLACK else Color.WHITE)
        (button.circle.background as? GradientDrawable)?.setColor(if (active) 0xFFFFFFFF.toInt() else 0x33FFFFFF)
    }

    private fun spacer(): View = View(this).apply { layoutParams = LinearLayout.LayoutParams(dp(16), 1) }

    /** Kichik pastki-belgi ("Kamera o'chirilgan" kabi) — Zoom/Telegram
     * uslubidagi qizil-shaffof yorliq. */
    private fun statusPill(text: String): TextView = TextView(this).apply {
        this.text = text
        setTextColor(Color.WHITE)
        textSize = 12f
        setPadding(dp(10), dp(4), dp(10), dp(4))
        background = GradientDrawable().apply {
            cornerRadius = dp(12).toFloat()
            setColor(0xB3FF3B30.toInt())
        }
        visibility = View.GONE
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
