package com.example.newmilano

import android.content.Intent
import android.os.Build
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Receives the backend's high-priority data push (action = PRINT_ORDER) and
 * wakes the print service to poll immediately — so a new ticket prints without
 * waiting for the next 5s poll, and even if the poll loop had stalled.
 *
 * We deliberately don't print straight from here: the service is the single
 * source of truth for what has printed (confirm-before-mark + in-flight guard),
 * so we just tell it to poll now and let it dedupe.
 */
class MilanoFcmService : FirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        val svc = Intent(this, OrderPrintService::class.java).apply {
            action = OrderPrintService.ACTION_POLL_NOW
            // Admin reprint: pass the order id so the service drops its local
            // "already printed" guard for it — otherwise the reprint is refused.
            if (message.data["reprint"] == "true") {
                putExtra(OrderPrintService.EXTRA_REPRINT_ORDER_ID, message.data["orderId"])
            }
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(svc)
            else startService(svc)
        } catch (e: Exception) {
            // If the OS blocks a background start, the 5s poll still catches it.
        }
    }

    override fun onNewToken(token: String) {
        val jwt = getSharedPreferences("milano_pos", MODE_PRIVATE)
            .getString("jwt_token", "") ?: ""
        if (jwt.isNotEmpty()) DeviceRegistrar.register(this, jwt, token)
    }
}
