package com.example.newmilano

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Restarts the order print service after a reboot or power cut (kitchen devices
 * do lose power). Uses the saved login so it resumes with no staff action. If
 * no one is logged in, does nothing.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        // Vendors differ: some send QUICKBOOT_POWERON instead of BOOT_COMPLETED,
        // and MY_PACKAGE_REPLACED fires after an app update — without it the
        // service stays dead until someone opens the app.
        val handled = action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_LOCKED_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON" ||
            action == "com.htc.intent.action.QUICKBOOT_POWERON"
        if (!handled) return

        // Start if we hold EITHER credential. The access token expires hourly, so
        // after a night switched off it is usually empty while the refresh token
        // is still good — and refusing to start then is exactly when orders get
        // missed.
        val prefs = context.getSharedPreferences("milano_pos", Context.MODE_PRIVATE)
        val token = prefs.getString("jwt_token", "") ?: ""
        val refresh = prefs.getString("refresh_token", "") ?: ""
        if (token.isEmpty() && refresh.isEmpty()) return

        val svc = Intent(context, OrderPrintService::class.java).apply {
            this.action = OrderPrintService.ACTION_START
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(svc)
            else context.startService(svc)
        } catch (e: Exception) {
            // Nothing we can do here; opening the app will start the service.
        }
    }
}
