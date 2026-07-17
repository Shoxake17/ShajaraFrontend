package uz.ajdo.shajara.calls

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import io.livekit.android.LiveKit
import io.livekit.android.events.RoomEvent
import io.livekit.android.renderer.TextureViewRenderer
import io.livekit.android.room.Room
import io.livekit.android.room.track.VideoTrack
import io.livekit.android.room.track.screencapture.ScreenCaptureParams
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

/**
 * To'liq native (WebView emas) qo'ng'iroq ekrani — LiveKit Android SDK
 * bilan to'g'ridan-to'g'ri ishlaydi. Ikkita boshlanish yo'li bor:
 *  - CHIQUVCHI: CallPlugin.startCall() shu Activity'ni EXTRA_OUTGOING=true
 *    bilan ochadi, o'zi /calls/invite so'raydi (CallsHttp).
 *  - KIRUVCHI: IncomingCallActivity foydalanuvchi "Qabul qilish"ni
 *    bosgandan KEYIN (/calls/accept allaqachon so'ralgan) shu Activity'ni
 *    tayyor roomName/token/livekitUrl bilan ochadi.
 *
 * Dasturiy (XML'siz) UI — soddalik uchun; tugma ikonkalari vaqtincha
 * tizimning standart drawable'lari (keyinroq maxsus ikonkalarga almashtirish
 * mumkin).
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
    }

    private var room: Room? = null
    private var callId: String? = null
    private var isVideo = false
    private var micMuted = false
    private var cameraOff = false
    private var screenSharing = false

    private lateinit var remoteContainer: FrameLayout
    private lateinit var statusText: TextView

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
                    kotlinx.coroutines.delay(1500)
                    finish()
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildUi()
        startCallFlow()
    }

    // launchMode="singleTask" (AndroidManifest.xml) — agar shu Activity'ning
    // eski nusxasi hali tirik bo'lsa (masalan oldingi qo'ng'iroq hali
    // to'liq yopilmagan bo'lsa), Android YANGI onCreate() chaqirmaydi,
    // yangi Intent'ni shu yerga (onNewIntent) yuboradi. Bu override
    // BO'LMASA, `intent`/`callId`/`isVideo` ESKI (oldingi) qo'ng'iroqning
    // ma'lumotlarida qolib ketadi — natijada yangi qo'ng'iroq NOTO'G'RI
    // xona/turdagi ma'lumot bilan ulanadi (masalan video kutilsa ham
    // kamera yoqilmaydi, chunki eski `isVideo=false` saqlanib qolgan).
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        room?.disconnect()
        room = null
        micMuted = false
        cameraOff = false
        screenSharing = false
        buildUi()
        startCallFlow()
    }

    private fun startCallFlow() {
        isVideo = intent.getStringExtra(EXTRA_CALL_TYPE) == "VIDEO"
        callId = intent.getStringExtra(EXTRA_CALL_ID)

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
        lifecycleScope.launch {
            try {
                val res = CallsHttp.invite(this@CallActivity, calleeId, type)
                callId = res.getString("callId")
                connectRoom(res.getString("livekitUrl"), res.getString("token"))
            } catch (e: Exception) {
                statusText.text = "Xatolik: ${e.message}"
            }
        }
    }

    private fun connectRoom(url: String, token: String) {
        lifecycleScope.launch {
            val newRoom = LiveKit.create(applicationContext)
            room = newRoom
            observeEvents(newRoom)
            try {
                newRoom.connect(url, token)
                newRoom.localParticipant.setMicrophoneEnabled(true)
                if (isVideo) newRoom.localParticipant.setCameraEnabled(true)
                statusText.text = "Ulandi"
            } catch (e: Exception) {
                statusText.text = "Ulanib bo'lmadi: ${e.message}"
            }
        }
    }

    private fun observeEvents(observedRoom: Room) {
        lifecycleScope.launch {
            // Room.events -&gt; EventListenable&lt;RoomEvent&gt;, uning o'zining
            // ".events" (SharedFlow&lt;RoomEvent&gt;) maydoni bor — shu bois ikki
            // qavat (LiveKit Android SDK 2.18.2 API'si shunday).
            observedRoom.events.events.collect { event ->
                // onNewIntent orqali ESKI xona almashtirilgan bo'lishi mumkin
                // (singleTask qayta ishlatish) — bu holatda eski xonaning
                // "Disconnected" hodisasi YANGI boshlangan qo'ng'iroqni
                // finish() qilib qo'ymasligi kerak.
                if (room !== observedRoom) return@collect
                if (event is RoomEvent.TrackSubscribed) {
                    val track = event.track
                    if (track is VideoTrack) {
                        val renderer = TextureViewRenderer(this@CallActivity)
                        observedRoom.initVideoRenderer(renderer)
                        track.addRenderer(renderer)
                        remoteContainer.removeAllViews()
                        remoteContainer.addView(
                            renderer,
                            FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT),
                        )
                    }
                }
                if (event is RoomEvent.Disconnected) {
                    finish()
                }
            }
        }
    }

    private fun toggleMic() {
        micMuted = !micMuted
        lifecycleScope.launch { room?.localParticipant?.setMicrophoneEnabled(!micMuted) }
    }

    private fun toggleCamera() {
        cameraOff = !cameraOff
        lifecycleScope.launch { room?.localParticipant?.setCameraEnabled(!cameraOff) }
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
    }

    private fun endCall() {
        val id = callId
        if (id != null) {
            lifecycleScope.launch { runCatching { CallsHttp.end(this@CallActivity, id) } }
        }
        room?.disconnect()
        stopService(Intent(this, ScreenCaptureService::class.java))
        finish()
    }

    override fun onDestroy() {
        room?.disconnect()
        super.onDestroy()
    }

    private fun buildUi() {
        val root = FrameLayout(this).apply { setBackgroundColor(0xFF000000.toInt()) }

        remoteContainer = FrameLayout(this)
        root.addView(remoteContainer, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

        statusText = TextView(this).apply {
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 16f
            gravity = Gravity.CENTER
        }
        val topBar = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 96, 32, 16)
            addView(statusText)
        }
        root.addView(
            topBar,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP),
        )

        val controls = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(16, 16, 16, 96)
        }
        fun button(iconRes: Int, tint: Int = 0xFFFFFFFF.toInt(), onClick: () -> Unit) = ImageButton(this).apply {
            setImageResource(iconRes)
            background = null
            setColorFilter(tint)
            setPadding(32, 32, 32, 32)
            setOnClickListener { onClick() }
        }
        controls.addView(button(android.R.drawable.ic_btn_speak_now) { toggleMic() })
        if (isVideo) controls.addView(button(android.R.drawable.ic_menu_camera) { toggleCamera() })
        controls.addView(button(android.R.drawable.ic_menu_share) { toggleScreenShare() })
        controls.addView(button(android.R.drawable.ic_menu_close_clear_cancel, 0xFFFF5252.toInt()) { endCall() })
        root.addView(
            controls,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM),
        )

        setContentView(root)
    }
}
