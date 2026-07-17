package uz.ajdo.shajara.calls

import android.content.Intent
import android.graphics.Color
import android.graphics.Outline
import android.graphics.drawable.GradientDrawable
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.firebase.crashlytics.FirebaseCrashlytics
import kotlinx.coroutines.launch
import uz.ajdo.shajara.R
import java.lang.ref.WeakReference

/**
 * Kiruvchi qo'ng'iroq — qulf ekranida ham to'liq ekran ko'rinadi
 * (AndroidManifest.xml: showWhenLocked/turnScreenOn). AjdoFirebaseMessagingService
 * push kelganda (`data.type == "call"`) NotificationCompat.CallStyle/
 * full-screen-intent orqali shu Activity'ni ochadi. Qo'ng'iroq "band"
 * bo'lsa (Redis TTL — calls.service.ts) yoki chaqiruvchi bekor qilsa,
 * bu ekran ochilgan holatda ham qolib ketmasligi uchun 30 soniyalik
 * avtomatik yopilish bor (backend'dagi RINGING_TTL_SECONDS bilan mos).
 *
 * UI — Telegram/Apple uslubidagi qo'ng'iroq ekrani: markazda avatar
 * (rasm yoki ism bosh harfi) + ism + qarindoshlik belgisi + holat,
 * pastda yumaloq yashil (qabul qilish) / qizil (rad etish) tugmalar.
 */
class IncomingCallActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_CALL_ID = "callId"
        const val EXTRA_CALLER_NAME = "callerName"
        const val EXTRA_CALL_TYPE = "callType"
        const val EXTRA_CALLER_AVATAR_URL = "callerAvatarUrl"
        const val EXTRA_CALLER_RELATION = "callerRelation"
        private const val AUTO_DISMISS_MS = 30_000L

        // Bir xil foydalanuvchi bir nechta qurilmada kirgan bo'lsa, hammasiga
        // push keladi — qaysi biri BIRINCHI javob bersa (yoki rad etsa),
        // QOLGANLARI ham darhol jiringlashni to'xtatishi kerak. Har bir
        // qurilma FAQAT o'zining joriy IncomingCallActivity nusxasini biladi
        // — shu bois statik (jarayon ichida) zaif havola orqali kuzatiladi.
        private var activeInstance: WeakReference<IncomingCallActivity>? = null
        private var activeCallId: String? = null

        /** AjdoFirebaseMessagingService (Java) `call_dismiss` push kelganda
         * chaqiradi — @JvmStatic bo'lmasa Java tomonidan to'g'ridan-to'g'ri
         * `IncomingCallActivity.dismissIfShowing(...)` sifatida ko'rinmaydi
         * (faqat `Companion.dismissIfShowing(...)` sifatida). */
        @JvmStatic
        fun dismissIfShowing(callId: String) {
            if (activeCallId != callId) return
            activeInstance?.get()?.let { activity ->
                if (!activity.isFinishing) {
                    activity.breadcrumb("dismissIfShowing: remote dismiss for callId=$callId")
                    activity.stopRinging()
                    activity.autoDismiss?.let { activity.window.decorView.removeCallbacks(it) }
                    activity.finish()
                }
            }
        }
    }

    private var ringtone: Ringtone? = null
    private var vibrator: Vibrator? = null
    private var autoDismiss: Runnable? = null

    private fun breadcrumb(msg: String) {
        try {
            FirebaseCrashlytics.getInstance().log(msg)
        } catch (_: Exception) {
        }
    }

    private fun dp(value: Int): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        breadcrumb("IncomingCallActivity.onCreate callId=${intent.getStringExtra(EXTRA_CALL_ID)} type=${intent.getStringExtra(EXTRA_CALL_TYPE)}")
        handleIntent()
    }

    // launchMode="singleTask" (AndroidManifest.xml) — agar oldingi
    // qo'ng'iroqning IncomingCallActivity nusxasi hali tirik bo'lsa
    // (masalan 30 soniyalik avtomatik yopilish hali tugamagan bo'lsa-yu,
    // YANGI qo'ng'iroq kelsa), Android bu yerga (onNewIntent) yo'naltiradi
    // — YANGI onCreate() chaqirilmaydi. Bu override BO'LMASA, ekranda
    // ESKI qo'ng'iroqning callId/callType/callerName'i qolib ketadi va
    // "Qabul qilish" bosilganda NOTO'G'RI (eski) qo'ng'iroq qabul qilinadi.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        breadcrumb("IncomingCallActivity.onNewIntent callId=${intent.getStringExtra(EXTRA_CALL_ID)}")
        setIntent(intent)
        stopRinging()
        autoDismiss?.let { window.decorView.removeCallbacks(it) }
        handleIntent()
    }

    private fun handleIntent() {
        val callId = intent.getStringExtra(EXTRA_CALL_ID)
        val callerName = intent.getStringExtra(EXTRA_CALLER_NAME) ?: "AJDO"
        val callType = intent.getStringExtra(EXTRA_CALL_TYPE) ?: "AUDIO"
        val avatarUrl = intent.getStringExtra(EXTRA_CALLER_AVATAR_URL)
        val relation = intent.getStringExtra(EXTRA_CALLER_RELATION)

        activeInstance = WeakReference(this)
        activeCallId = callId

        breadcrumb("handleIntent: buildUi")
        buildUi(callerName, callType == "VIDEO", callId, avatarUrl, relation)
        breadcrumb("handleIntent: startRinging")
        startRinging()
        breadcrumb("handleIntent: ringing started OK")

        val dismiss = Runnable { if (!isFinishing) finish() }
        autoDismiss = dismiss
        window.decorView.postDelayed(dismiss, AUTO_DISMISS_MS)
    }

    // MUHIM: Vibrator.vibrate() android.permission.VIBRATE manifestda e'lon
    // qilinmagan bo'lsa SecurityException tashlaydi (asosiy threadda,
    // sinxron) — bu try/catch BO'LMASA, har bir kiruvchi qo'ng'iroqda
    // (turi audio/video farqisiz) ilova darhol krash bo'lardi. Ruxsat endi
    // manifestda bor, lekin qo'shimcha himoya sifatida (RingtoneManager
    // ham ba'zi OEM/DND sozlamalarida istisno tashlashi mumkin) butun
    // funksiya himoyalangan.
    private fun startRinging() {
        try {
            val uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_RINGTONE)
            ringtone = RingtoneManager.getRingtone(this, uri)?.apply {
                audioAttributes = android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build()
                play()
            }
        } catch (e: Exception) {
            breadcrumb("startRinging: ringtone FAILED: ${e.message}")
            FirebaseCrashlytics.getInstance().recordException(e)
        }
        try {
            vibrator = if (android.os.Build.VERSION.SDK_INT >= 31) {
                (getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(VIBRATOR_SERVICE) as Vibrator
            }
            vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 800, 500), 0))
        } catch (e: Exception) {
            breadcrumb("startRinging: vibrate FAILED: ${e.message}")
            FirebaseCrashlytics.getInstance().recordException(e)
        }
    }

    private fun stopRinging() {
        ringtone?.stop()
        vibrator?.cancel()
    }

    private fun accept(callId: String?, isVideo: Boolean) {
        breadcrumb("accept tapped callId=$callId")
        if (callId == null) return finish()
        stopRinging()
        lifecycleScope.launch {
            try {
                val res = CallsHttp.accept(this@IncomingCallActivity, callId)
                breadcrumb("accept: CallsHttp.accept OK, launching CallActivity")
                val intent = Intent(this@IncomingCallActivity, CallActivity::class.java).apply {
                    putExtra(CallActivity.EXTRA_CALL_ID, callId)
                    putExtra(CallActivity.EXTRA_CALL_TYPE, if (isVideo) "VIDEO" else "AUDIO")
                    putExtra(CallActivity.EXTRA_ROOM_NAME, res.getString("roomName"))
                    putExtra(CallActivity.EXTRA_TOKEN, res.getString("token"))
                    putExtra(CallActivity.EXTRA_LIVEKIT_URL, res.getString("livekitUrl"))
                    putExtra(CallActivity.EXTRA_PEER_NAME, intent.getStringExtra(EXTRA_CALLER_NAME))
                    putExtra(CallActivity.EXTRA_PEER_PHOTO_URL, intent.getStringExtra(EXTRA_CALLER_AVATAR_URL))
                    putExtra(CallActivity.EXTRA_PEER_RELATION, intent.getStringExtra(EXTRA_CALLER_RELATION))
                }
                startActivity(intent)
            } catch (e: Exception) {
                // qo'ng'iroq muddati o'tgan/bekor qilingan bo'lishi mumkin —
                // lekin Crashlytics'ga baribir yozib qo'yamiz, aks holda
                // haqiqiy xatolar sababsiz qolib ketaveradi.
                breadcrumb("accept: CallsHttp.accept FAILED: ${e.message}")
                FirebaseCrashlytics.getInstance().recordException(e)
            }
            finish()
        }
    }

    private fun decline(callId: String?) {
        breadcrumb("decline tapped callId=$callId")
        stopRinging()
        if (callId != null) {
            lifecycleScope.launch { runCatching { CallsHttp.decline(this@IncomingCallActivity, callId) } }
        }
        finish()
    }

    override fun onDestroy() {
        breadcrumb("IncomingCallActivity.onDestroy isFinishing=$isFinishing")
        stopRinging()
        if (activeInstance?.get() === this) {
            activeInstance = null
            activeCallId = null
        }
        super.onDestroy()
    }

    private fun buildUi(callerName: String, isVideo: Boolean, callId: String?, avatarUrl: String?, relation: String?) {
        // Web (IncomingCallBanner.tsx) bilan bir xil — quyuq qora fon.
        val root = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }

        val center = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
        }

        val avatarSize = dp(150)
        val avatarFrame = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(avatarSize, avatarSize)
            // View darajasidagi oval clip — rasm HAR DOIM to'g'ri doira
            // ko'rinishida chiqishi uchun (faqat bitmap-mask'ga tayanmaslik).
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setOval(0, 0, view.width, view.height)
                }
            }
            clipToOutline = true
        }
        val initialsView = TextView(this).apply {
            gravity = Gravity.CENTER
            textSize = 56f
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(CallAvatar.colorFor(callerName))
            }
        }
        val photoView = ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            visibility = View.GONE
        }
        avatarFrame.addView(initialsView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        avatarFrame.addView(photoView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        CallAvatar.bind(photoView, initialsView, callerName, avatarUrl)
        center.addView(avatarFrame)

        center.addView(
            TextView(this).apply {
                text = callerName
                setTextColor(Color.WHITE)
                textSize = 26f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
                gravity = Gravity.CENTER
                setPadding(dp(24), dp(24), dp(24), 0)
            },
        )
        // Qarindoshlik belgisi ("Aka", "Ona", ...) — Shajara doskasidagi
        // bilan bir xil, kim qo'ng'iroq qilyapganini aniq bilish uchun.
        if (!relation.isNullOrBlank()) {
            center.addView(
                TextView(this).apply {
                    text = relation
                    setTextColor(0xCCFFFFFF.toInt())
                    textSize = 14f
                    gravity = Gravity.CENTER
                    setPadding(0, dp(2), 0, 0)
                },
            )
        }
        center.addView(
            TextView(this).apply {
                text = if (isVideo) "Video qo'ng'iroq qilyapti..." else "Ovozli qo'ng'iroq qilyapti..."
                setTextColor(0xB3FFFFFF.toInt())
                textSize = 16f
                gravity = Gravity.CENTER
                setPadding(0, dp(8), 0, 0)
            },
        )
        root.addView(center, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER))

        val buttons = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }
        buttons.addView(callButton(isDecline = true) { decline(callId) })
        val spacer = View(this).apply { layoutParams = LinearLayout.LayoutParams(dp(64), 1) }
        buttons.addView(spacer)
        buttons.addView(callButton(isDecline = false) { accept(callId, isVideo) })

        root.addView(
            buttons,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL,
            ).apply { bottomMargin = dp(72) },
        )

        setContentView(root)
    }

    /** Yumaloq yashil (qabul qilish) / qizil (rad etish) tugma — pastida
     * yorlig'i bilan, Telegram/Apple uslubidagi qo'ng'iroq ekrani kabi. */
    private fun callButton(isDecline: Boolean, onClick: () -> Unit): LinearLayout {
        val size = dp(72)
        val color = if (isDecline) 0xFFFF3B30.toInt() else 0xFF34C759.toInt()
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
        }
        val circle = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(size, size)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(color)
            }
            isClickable = true
            isFocusable = true
            setOnClickListener { onClick() }
        }
        val icon = ImageView(this).apply {
            setImageResource(R.drawable.ic_call)
            rotation = if (isDecline) 135f else 0f
        }
        val iconSize = dp(28)
        circle.addView(icon, FrameLayout.LayoutParams(iconSize, iconSize, Gravity.CENTER))
        container.addView(circle)
        container.addView(
            TextView(this).apply {
                text = if (isDecline) "Rad etish" else "Qabul qilish"
                setTextColor(Color.WHITE)
                textSize = 13f
                gravity = Gravity.CENTER
                setPadding(0, dp(10), 0, 0)
            },
        )
        return container
    }
}
