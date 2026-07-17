package uz.ajdo.shajara.calls

import android.content.Intent
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

/**
 * Kiruvchi qo'ng'iroq — qulf ekranida ham to'liq ekran ko'rinadi
 * (AndroidManifest.xml: showWhenLocked/turnScreenOn). AjdoFirebaseMessagingService
 * push kelganda (`data.type == "call"`) NotificationCompat.CallStyle/
 * full-screen-intent orqali shu Activity'ni ochadi. Qo'ng'iroq "band"
 * bo'lsa (Redis TTL — calls.service.ts) yoki chaqiruvchi bekor qilsa,
 * bu ekran ochilgan holatda ham qolib ketmasligi uchun 45soniyalik
 * avtomatik yopilish bor (backend'dagi RINGING_TTL_SECONDS bilan mos).
 */
class IncomingCallActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_CALL_ID = "callId"
        const val EXTRA_CALLER_NAME = "callerName"
        const val EXTRA_CALL_TYPE = "callType"
        private const val AUTO_DISMISS_MS = 45_000L
    }

    private var ringtone: Ringtone? = null
    private var vibrator: Vibrator? = null
    private var autoDismiss: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent()
    }

    // launchMode="singleTask" (AndroidManifest.xml) — agar oldingi
    // qo'ng'iroqning IncomingCallActivity nusxasi hali tirik bo'lsa
    // (masalan 45 soniyalik avtomatik yopilish hali tugamagan bo'lsa-yu,
    // YANGI qo'ng'iroq kelsa), Android bu yerga (onNewIntent) yo'naltiradi
    // — YANGI onCreate() chaqirilmaydi. Bu override BO'LMASA, ekranda
    // ESKI qo'ng'iroqning callId/callType/callerName'i qolib ketadi va
    // "Qabul qilish" bosilganda NOTO'G'RI (eski) qo'ng'iroq qabul qilinadi
    // — aynan shu CallActivity'dagi video/audio nomuvofiqlik va
    // bir-tomonlama aloqa muammosining ildizi edi.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        stopRinging()
        autoDismiss?.let { window.decorView.removeCallbacks(it) }
        handleIntent()
    }

    private fun handleIntent() {
        val callId = intent.getStringExtra(EXTRA_CALL_ID)
        val callerName = intent.getStringExtra(EXTRA_CALLER_NAME) ?: "AJDO"
        val callType = intent.getStringExtra(EXTRA_CALL_TYPE) ?: "AUDIO"

        buildUi(callerName, callType == "VIDEO", callId)
        startRinging()

        val dismiss = Runnable { if (!isFinishing) finish() }
        autoDismiss = dismiss
        window.decorView.postDelayed(dismiss, AUTO_DISMISS_MS)
    }

    private fun startRinging() {
        val uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_RINGTONE)
        ringtone = RingtoneManager.getRingtone(this, uri)?.apply {
            audioAttributes = android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build()
            play()
        }
        vibrator = if (android.os.Build.VERSION.SDK_INT >= 31) {
            (getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(VIBRATOR_SERVICE) as Vibrator
        }
        vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 800, 500), 0))
    }

    private fun stopRinging() {
        ringtone?.stop()
        vibrator?.cancel()
    }

    private fun accept(callId: String?, isVideo: Boolean) {
        if (callId == null) return finish()
        stopRinging()
        lifecycleScope.launch {
            try {
                val res = CallsHttp.accept(this@IncomingCallActivity, callId)
                val intent = Intent(this@IncomingCallActivity, CallActivity::class.java).apply {
                    putExtra(CallActivity.EXTRA_CALL_ID, callId)
                    putExtra(CallActivity.EXTRA_CALL_TYPE, if (isVideo) "VIDEO" else "AUDIO")
                    putExtra(CallActivity.EXTRA_ROOM_NAME, res.getString("roomName"))
                    putExtra(CallActivity.EXTRA_TOKEN, res.getString("token"))
                    putExtra(CallActivity.EXTRA_LIVEKIT_URL, res.getString("livekitUrl"))
                }
                startActivity(intent)
            } catch (e: Exception) {
                // jim — qo'ng'iroq muddati o'tgan/bekor qilingan bo'lishi mumkin
            }
            finish()
        }
    }

    private fun decline(callId: String?) {
        stopRinging()
        if (callId != null) {
            lifecycleScope.launch { runCatching { CallsHttp.decline(this@IncomingCallActivity, callId) } }
        }
        finish()
    }

    override fun onDestroy() {
        stopRinging()
        super.onDestroy()
    }

    private fun buildUi(callerName: String, isVideo: Boolean, callId: String?) {
        val root = FrameLayout(this).apply { setBackgroundColor(0xFF000000.toInt()) }

        val center = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
        }
        center.addView(
            TextView(this).apply {
                text = callerName
                setTextColor(0xFFFFFFFF.toInt())
                textSize = 24f
                gravity = Gravity.CENTER
            },
        )
        center.addView(
            TextView(this).apply {
                text = if (isVideo) "Video qo'ng'iroq qilyapti..." else "Ovozli qo'ng'iroq qilyapti..."
                setTextColor(0xB3FFFFFF.toInt())
                textSize = 14f
                gravity = Gravity.CENTER
                setPadding(0, 16, 0, 0)
            },
        )
        root.addView(center, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER))

        val buttons = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(32, 32, 32, 96)
        }
        buttons.addView(
            Button(this).apply {
                text = "Rad etish"
                setOnClickListener { decline(callId) }
            },
            LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginEnd = 16 },
        )
        buttons.addView(
            Button(this).apply {
                text = "Qabul qilish"
                setOnClickListener { accept(callId, isVideo) }
            },
            LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f),
        )
        root.addView(
            buttons,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM),
        )

        setContentView(root)
    }
}
