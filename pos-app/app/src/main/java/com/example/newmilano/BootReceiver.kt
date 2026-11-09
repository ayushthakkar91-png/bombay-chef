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
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_LOCKED_BOOT_COMPLETED
        ) return

        val token = context.getSharedPreferences("milano_pos", Context.MODE_PRIVATE)
            .getString("jwt_token", "")
        if (token.isNullOrEmpty()) return

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
