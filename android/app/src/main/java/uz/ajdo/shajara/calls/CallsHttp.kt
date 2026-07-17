package uz.ajdo.shajara.calls

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * Backend "/calls" REST endpointlariga sof native (JS/WebView'siz)
 * so'rovlar — CallActivity/IncomingCallActivity shu orqali ishlaydi.
 * AuthTokenBridge orqali saqlangan access-token bilan autentifikatsiya
 * qilinadi (JS bilan BIR XIL endpointlar — backend: calls.controller.ts).
 */
object CallsHttp {
    // ShajaraFrontend/.env.capacitor'dagi VITE_API_URL bilan BIR XIL — native
    // kod Vite build-time o'zgaruvchilarini o'qiy olmaydi, shuning uchun bu
    // yerda alohida qattiq yozilgan.
    private const val BASE_URL = "https://ajdo.uz/api/v1"
    private const val TIMEOUT_MS = 10_000

    suspend fun invite(context: Context, calleeId: String, callType: String): JSONObject =
        post(context, "/calls/invite", JSONObject().put("calleeId", calleeId).put("type", callType))

    suspend fun accept(context: Context, callId: String): JSONObject =
        post(context, "/calls/accept", JSONObject().put("callId", callId))

    suspend fun decline(context: Context, callId: String): JSONObject =
        post(context, "/calls/decline", JSONObject().put("callId", callId))

    suspend fun end(context: Context, callId: String): JSONObject =
        post(context, "/calls/end", JSONObject().put("callId", callId))

    private suspend fun post(context: Context, path: String, body: JSONObject): JSONObject =
        withContext(Dispatchers.IO) {
            val token = AuthTokenBridge.accessToken(context)
                ?: throw IllegalStateException("Autentifikatsiya tokeni topilmadi")
            val connection = URL(BASE_URL + path).openConnection() as HttpURLConnection
            try {
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.connectTimeout = TIMEOUT_MS
                connection.readTimeout = TIMEOUT_MS
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Authorization", "Bearer $token")
                OutputStreamWriter(connection.outputStream).use { it.write(body.toString()) }

                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
                if (status !in 200..299) {
                    throw IllegalStateException("Server xatosi ($status): $text")
                }
                if (text.isBlank()) JSONObject() else JSONObject(text)
            } finally {
                connection.disconnect()
            }
        }
}
