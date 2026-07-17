package uz.ajdo.shajara.calls

import android.Manifest
import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Outline
import android.graphics.drawable.GradientDrawable
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.os.IBinder
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
import io.livekit.android.renderer.TextureViewRenderer
import io.livekit.android.room.track.VideoTrack
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
    private lateinit var controlsRow: LinearLayout
    private lateinit var micButton: ToggleButton
    private var cameraButton: ToggleButton? = null
    private lateinit var speakerButton: ToggleButton
    private lateinit var screenShareButton: ToggleButton

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
        controlsRow.visibility = if (svc.hadRemotePeer) View.VISIBLE else View.GONE
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
        updateVideoLayout(remoteActive)
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
        updateVideoLayout(track != null)
    }

    override fun onCallEnded() {
        breadcrumb("CallActivity.onCallEnded -> finish()")
        finish()
    }

    private fun attachRenderers(svc: CallService) {
        val remoteTrack = svc.currentRemoteVideoTrack()
        if (remoteTrack != null) onRemoteVideoTrack(remoteTrack)
        if (svc.isVideo && !svc.cameraOff) attachLocalPreview(svc)
        updateVideoLayout(remoteTrack != null)
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

    /** Video joylashuvi: hali suhbatdosh (masofaviy video) yo'q bo'lsa —
     * MENING kamерам TO'LIQ EKRAN (Telegram/Apple "kutish" holati);
     * suhbatdosh qo'shilgach — u to'liq ekran, meniki kichik burchakdagi
     * oynaga ("PiP") almashadi. */
    private fun updateVideoLayout(remoteActive: Boolean) {
        val hasLocal = localVideoContainer.childCount > 0
        if (remoteActive) {
            localVideoContainer.layoutParams = FrameLayout.LayoutParams(dp(110), dp(150), Gravity.TOP or Gravity.END).apply {
                topMargin = dp(56)
                rightMargin = dp(16)
            }
            localVideoContainer.visibility = if (hasLocal) View.VISIBLE else View.GONE
            centerOverlay.visibility = View.GONE
            topBadge.visibility = View.VISIBLE
        } else if (hasLocal) {
            localVideoContainer.layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            localVideoContainer.visibility = View.VISIBLE
            centerOverlay.visibility = View.GONE
            topBadge.visibility = View.VISIBLE
        } else {
            localVideoContainer.visibility = View.GONE
            centerOverlay.visibility = View.VISIBLE
            topBadge.visibility = View.GONE
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
                topMargin = dp(56)
                rightMargin = dp(16)
            },
        )

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
                topMargin = dp(56)
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

        val controlsColumn = LinearLayout(this).apply {
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
