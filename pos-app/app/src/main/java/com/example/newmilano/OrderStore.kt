package com.example.newmilano

import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf

/**
 * Shared, observable order state.
 *
 * Written by OrderPrintService (the foreground service that polls + prints) and
 * observed by the Compose UI in MainActivity. Using Compose snapshot state means
 * the UI recomposes automatically when the service updates it — the service is
 * the single source of truth for what has been printed, so receipts keep
 * printing even when the Activity is backgrounded or the screen is off.
 */
object OrderStore {
    val orders = mutableStateListOf<OrderRow>()
    val connected = mutableStateOf(false)
    val printerReady = mutableStateOf(false)

    // True while staff have muted the new-order alarm. Auto-reset to false when a
    // brand-new order arrives, so the next order still sounds.
    val alarmMuted = mutableStateOf(false)

    // Advisory printer message (e.g. cover/top open, out of paper). Shown as an
    // in-app banner + notification so staff get a clear, actionable instruction
    // instead of the Sunmi SDK's cryptic "device is open" toast. Advisory only —
    // never blocks printing; the order still prints/retries once the issue clears.
    val printerMessage = mutableStateOf("")

    // Set by the poll loop when the stored session was DEFINITIVELY rejected on a
    // silent re-login (credentials changed/disabled) — not a transient network or
    // expiry blip, which the service refreshes automatically. The UI observes this
    // and drops to the login screen instead of showing a stuck "Reconnecting…".
    val sessionExpired = mutableStateOf(false)
}
