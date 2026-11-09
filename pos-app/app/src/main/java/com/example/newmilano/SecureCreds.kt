package com.example.newmilano

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Securely stores staff login credentials so the print service can silently
 * re-authenticate when the POS JWT expires. A POS terminal is always-on, and the
 * backend issues short-lived tokens (24h admin / 7d staff), so without this the
 * poll loop 401s forever and the UI sits on "Reconnecting…" until a manual
 * logout/login.
 *
 * Backed by the Android Keystore via EncryptedSharedPreferences. Every access is
 * guarded: if encryption is unavailable on a device, we behave exactly as before
 * (no stored creds -> the app drops to the login screen when the token expires).
 */
object SecureCreds {
    private const val FILE = "pos_secure_creds"

    private fun prefs(ctx: Context): SharedPreferences? = try {
        val key = MasterKey.Builder(ctx).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
        EncryptedSharedPreferences.create(
            ctx, FILE, key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (e: Exception) {
        null
    }

    fun save(ctx: Context, email: String, password: String) {
        try {
            prefs(ctx)?.edit()?.putString("email", email)?.putString("password", password)?.apply()
        } catch (e: Exception) {
        }
    }

    fun load(ctx: Context): Pair<String, String>? {
        val p = prefs(ctx) ?: return null
        val e = p.getString("email", "") ?: ""
        val pw = p.getString("password", "") ?: ""
        return if (e.isNotEmpty() && pw.isNotEmpty()) e to pw else null
    }

    fun clear(ctx: Context) {
        try {
            prefs(ctx)?.edit()?.clear()?.apply()
        } catch (e: Exception) {
        }
    }
}
