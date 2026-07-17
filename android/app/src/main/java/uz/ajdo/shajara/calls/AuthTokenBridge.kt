package uz.ajdo.shajara.calls

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * JS tomonidagi (axios/localStorage'dagi) joriy access-tokenni native
 * xavfsiz saqlashga (shifrlangan) sinxronlaydi — shunda WebView/JS ishga
 * tushmagan holatda ham (masalan ilova butunlay yopiq bo'lganda push
 * kelganda) AjdoFirebaseMessagingService, CallActivity, ScreenCaptureService
 * kabi sof native kod mustaqil ravishda autentifikatsiyalangan REST so'rov
 * qila oladi (CallsHttp.kt).
 *
 * Yozish tomoni: CallPlugin.syncAuthToken()/clearAuthToken() — JS'dan
 * auth.store.ts har safar accessToken o'zgarganda (login/refresh/logout)
 * chaqiradi.
 */
object AuthTokenBridge {
    private const val PREFS_NAME = "ajdo_auth_bridge"
    private const val KEY_ACCESS_TOKEN = "access_token"
    private const val KEY_USER_ID = "user_id"

    private fun prefs(context: Context) = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun save(context: Context, accessToken: String, userId: String) {
        prefs(context).edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_USER_ID, userId)
            .apply()
    }

    fun clear(context: Context) {
        prefs(context).edit().clear().apply()
    }

    fun accessToken(context: Context): String? = prefs(context).getString(KEY_ACCESS_TOKEN, null)

    fun userId(context: Context): String? = prefs(context).getString(KEY_USER_ID, null)
}
