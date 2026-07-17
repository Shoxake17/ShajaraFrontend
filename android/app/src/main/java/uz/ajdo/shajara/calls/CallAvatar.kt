package uz.ajdo.shajara.calls

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Telegram/Apple uslubidagi qo'ng'iroq ekrani avatari — CallActivity va
 * IncomingCallActivity ikkalasida ham bir xil ishlaydi: ISM BOSH HARFI
 * (rangli doira ustida) DARHOL ko'rsatiladi (tarmoq kutmasdan), rasm bo'lsa
 * fonda yuklab olinib, tayyor bo'lgach doiraviy qirqilgan holda almashtiradi.
 */
object CallAvatar {
    private const val TIMEOUT_MS = 5000
    private const val MAX_DIMENSION = 512

    // Telegram uslubidagi barqaror (ism bo'yicha, tasodifiy emas) rang
    // palitrasi — bir xil odam har doim bir xil rangda ko'rinadi.
    private val PALETTE = intArrayOf(
        0xFFE57373.toInt(), 0xFFF06292.toInt(), 0xFFBA68C8.toInt(), 0xFF9575CD.toInt(),
        0xFF7986CB.toInt(), 0xFF64B5F6.toInt(), 0xFF4FC3F7.toInt(), 0xFF4DD0E1.toInt(),
        0xFF4DB6AC.toInt(), 0xFF81C784.toInt(), 0xFFAED581.toInt(), 0xFFFFB74D.toInt(),
        0xFFFF8A65.toInt(), 0xFFA1887F.toInt(),
    )

    fun colorFor(name: String): Int {
        val key = name.ifBlank { "?" }
        val idx = (key.sumOf { it.code }) % PALETTE.size
        return PALETTE[idx]
    }

    fun initial(name: String): String {
        val trimmed = name.trim()
        return if (trimmed.isEmpty()) "?" else trimmed.take(1).uppercase()
    }

    /**
     * `initialsView` (rangli doira ustidagi TextView) DARHOL to'ldiriladi;
     * `photoUrl` bo'lsa, fonda yuklab olinadi va tayyor bo'lgach
     * `photoView` (doiraviy ImageView) bilan almashtiriladi.
     */
    fun bind(photoView: ImageView, initialsView: TextView, name: String, photoUrl: String?) {
        initialsView.text = initial(name)
        initialsView.setBackgroundColor(colorFor(name))
        initialsView.visibility = View.VISIBLE
        photoView.visibility = View.GONE

        if (photoUrl.isNullOrBlank()) return

        CoroutineScope(Dispatchers.IO).launch {
            val circular = runCatching { getCircularBitmap(downloadBitmap(photoUrl)) }.getOrNull() ?: return@launch
            withContext(Dispatchers.Main) {
                photoView.setImageBitmap(circular)
                photoView.visibility = View.VISIBLE
                initialsView.visibility = View.GONE
            }
        }
    }

    private fun getCircularBitmap(bitmap: Bitmap): Bitmap {
        val size = minOf(bitmap.width, bitmap.height)
        val output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val left = (bitmap.width - size) / 2
        val top = (bitmap.height - size) / 2
        val srcRect = Rect(left, top, left + size, top + size)
        val dstRect = Rect(0, 0, size, size)
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)
        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
        canvas.drawBitmap(bitmap, srcRect, dstRect, paint)
        return output
    }

    private fun downloadBitmap(urlStr: String): Bitmap {
        val connection = URL(urlStr).openConnection() as HttpURLConnection
        try {
            connection.connectTimeout = TIMEOUT_MS
            connection.readTimeout = TIMEOUT_MS
            connection.doInput = true
            connection.connect()
            check(connection.responseCode == HttpURLConnection.HTTP_OK) { "HTTP ${connection.responseCode}" }

            val bytes = connection.inputStream.use { it.readBytesCompat() }

            val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, boundsOptions)
            var sampleSize = 1
            while ((boundsOptions.outWidth / sampleSize) > MAX_DIMENSION || (boundsOptions.outHeight / sampleSize) > MAX_DIMENSION) {
                sampleSize *= 2
            }
            val decodeOptions = BitmapFactory.Options().apply { inSampleSize = sampleSize }
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOptions)
                ?: error("decodeByteArray returned null")
        } finally {
            connection.disconnect()
        }
    }

    private fun InputStream.readBytesCompat(): ByteArray {
        val buffer = java.io.ByteArrayOutputStream()
        val chunk = ByteArray(8192)
        var read: Int
        while (this.read(chunk).also { read = it } != -1) {
            buffer.write(chunk, 0, read)
        }
        return buffer.toByteArray()
    }
}
