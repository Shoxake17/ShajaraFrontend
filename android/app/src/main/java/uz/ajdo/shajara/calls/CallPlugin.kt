package uz.ajdo.shajara.calls

import android.content.Intent
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * JS (native-call.ts) chaqiruv boshlashda shu orqali to'liq native
 * CallActivity'ni ochadi — Android'da WebView (livekit-client) EMAS (qulf
 * ekranida jiringlash va ekran ulashishni boshlash uchun shart). Shu bilan
 * bir qatorda AuthTokenBridge'ni JS access-tokeni bilan sinxronlaydi —
 * MainActivity.java'da qo'lda ro'yxatga olinadi (BillingPlugin kabi).
 */
@CapacitorPlugin(name = "CallPlugin")
class CallPlugin : Plugin() {

    @PluginMethod
    fun startCall(call: PluginCall) {
        val calleeId = call.getString("calleeId")
        val callType = call.getString("callType") ?: "AUDIO"
        if (calleeId == null) {
            call.reject("calleeId majburiy")
            return
        }
        val intent = Intent(context, CallActivity::class.java).apply {
            putExtra(CallActivity.EXTRA_CALLEE_ID, calleeId)
            putExtra(CallActivity.EXTRA_CALL_TYPE, callType)
            putExtra(CallActivity.EXTRA_OUTGOING, true)
            // JS'dan (ChatContact, server so'rovisiz) — Apple/Telegram
            // uslubidagi ekranda chaqirilayotgan odam ismi/rasmini darhol
            // ko'rsatish uchun.
            call.getString("calleeName")?.let { putExtra(CallActivity.EXTRA_PEER_NAME, it) }
            call.getString("calleePhotoUrl")?.let { putExtra(CallActivity.EXTRA_PEER_PHOTO_URL, it) }
            call.getString("calleeRelation")?.let { putExtra(CallActivity.EXTRA_PEER_RELATION, it) }
        }
        activity.startActivity(intent)
        call.resolve()
    }

    /** auth.store.ts har safar accessToken o'zgarganda (login/refresh) chaqiradi. */
    @PluginMethod
    fun syncAuthToken(call: PluginCall) {
        val accessToken = call.getString("accessToken")
        val userId = call.getString("userId")
        if (accessToken == null || userId == null) {
            call.reject("accessToken va userId majburiy")
            return
        }
        AuthTokenBridge.save(context, accessToken, userId)
        call.resolve()
    }

    /** auth.store.ts logout()da chaqiradi. */
    @PluginMethod
    fun clearAuthToken(call: PluginCall) {
        AuthTokenBridge.clear(context)
        call.resolve()
    }
}
