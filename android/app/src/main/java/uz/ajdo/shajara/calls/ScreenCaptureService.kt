package uz.ajdo.shajara.calls

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import uz.ajdo.shajara.R

/**
 * Ekran ulashish uchun MAJBURIY foreground xizmat (Android 10+ talabi,
 * `foregroundServiceType="mediaProjection"` — AndroidManifest.xml) —
 * MediaProjection ruxsati FAQAT shu xizmat ishlab turganda amal qiladi.
 * Haqiqiy suratga olishning o'zi LiveKit Android SDK
 * (LocalParticipant.setScreenShareEnabled) tomonidan boshqariladi — bu
 * xizmat faqat OS talabini qondirish uchun CallActivity ekran ulashishni
 * boshlagandan tugatgunga qadar "tirik" turadi.
 */
class ScreenCaptureService : Service() {
    companion object {
        private const val CHANNEL_ID = "screen_capture"
        private const val NOTIFICATION_ID = 5001
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        return START_NOT_STICKY
    }

    private fun buildNotification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Ekran ulashish", NotificationManager.IMPORTANCE_LOW),
            )
        }
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Ekran ulashilmoqda")
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setOngoing(true)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
