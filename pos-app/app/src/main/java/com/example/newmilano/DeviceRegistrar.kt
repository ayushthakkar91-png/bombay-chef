package com.example.newmilano

import android.content.Context
import android.os.Build
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Registers this device's FCM token with the backend so the server can push
 * new-order wakes (POST /api/devices/register, admin-authenticated).
 *
 * Without this the Device collection stays empty and every server push returns
 * "no-active-devices" — FCM does nothing and the POS relies purely on the 5s
 * poll. Call after login and whenever the token rotates (onNewToken).
 */
object DeviceRegistrar {
    private val SERVER_URL = BuildConfig.SERVER_URL

    private val client = OkHttpClient()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /** Register with an explicit token, or fetch the current one if null. */
    fun register(context: Context, jwt: String, token: String? = null) {
        if (jwt.isEmpty()) return
        if (token != null) {
            post(jwt, token)
            return
        }
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) task.result?.let { post(jwt, it) }
        }
    }

    private fun post(jwt: String, fcmToken: String) {
        scope.launch {
            try {
                val body = JSONObject().apply {
                    put("fcmToken", fcmToken)
                    put("locationSlug", BuildConfig.LOCATION_SLUG)
                    put("deviceName", "Sunmi V2")
                    put("deviceModel", Build.MODEL ?: "V2")
                }
                val req = Request.Builder()
                    .url("$SERVER_URL/devices/register")
                    .addHeader("Authorization", "Bearer $jwt")
                    .post(body.toString().toRequestBody("application/json".toMediaType()))
                    .build()
                client.newCall(req).execute().close()
            } catch (e: Exception) {
                // Best-effort: polling still delivers orders if registration fails.
            }
        }
    }
}
