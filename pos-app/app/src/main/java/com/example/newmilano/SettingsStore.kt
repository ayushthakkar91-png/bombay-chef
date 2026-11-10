package com.example.newmilano

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf

/**
 * Persistent POS settings, exposed as Compose state so both the UI (MainActivity)
 * and the print service react immediately, and written straight back to
 * SharedPreferences so they survive restarts.
 *
 * Call [init] once at startup (done in MainActivity.onCreate AND
 * OrderPrintService.onCreate, since the service can start on boot without the UI).
 */
object SettingsStore {
    private const val PREFS = "pos_settings"
    private var prefs: SharedPreferences? = null
    private var loaded = false

    // ---- Printing ----
    val printCopies = mutableStateOf(1)         // receipts per order (1..5)
    val printLogo = mutableStateOf(true)        // shop name header
    val printAddress = mutableStateOf(true)     // shop address + phone on receipt
    val printCategories = mutableStateOf(false) // group items by category
    val smallVersion = mutableStateOf(false)    // compact receipt (saves paper)
    val printVersion = mutableStateOf(true)     // app version footer
    // Seconds to wait after one ticket before the next one prints. When several
    // orders land at once the printer spits them out back to back and they are
    // easy to tear off as one strip; a pause separates them. 0 = no pause.
    val printGapSec = mutableStateOf(4)         // 0..15

    // ---- Alerts ----
    val soundEnabled = mutableStateOf(true)

    // ---- Order list ----
    val showTodayOnly = mutableStateOf(true)
    val hideConfirmed = mutableStateOf(false)

    fun init(context: Context) {
        if (loaded) return
        val p = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs = p
        printCopies.value = p.getInt("printCopies", 1).coerceIn(1, 5)
        printLogo.value = p.getBoolean("printLogo", true)
        printAddress.value = p.getBoolean("printAddress", true)
        printCategories.value = p.getBoolean("printCategories", false)
        smallVersion.value = p.getBoolean("smallVersion", false)
        printVersion.value = p.getBoolean("printVersion", true)
        printGapSec.value = p.getInt("printGapSec", 4).coerceIn(0, 15)
        soundEnabled.value = p.getBoolean("soundEnabled", true)
        showTodayOnly.value = p.getBoolean("showTodayOnly", true)
        hideConfirmed.value = p.getBoolean("hideConfirmed", false)
        loaded = true
    }

    fun setGapSec(n: Int) {
        printGapSec.value = n.coerceIn(0, 15)
        prefs?.edit()?.putInt("printGapSec", printGapSec.value)?.apply()
    }

    fun setCopies(n: Int) {
        printCopies.value = n.coerceIn(1, 5)
        prefs?.edit()?.putInt("printCopies", printCopies.value)?.apply()
    }

    /** Toggle a boolean setting and persist it. */
    fun toggle(key: String, state: MutableState<Boolean>, value: Boolean) {
        state.value = value
        prefs?.edit()?.putBoolean(key, value)?.apply()
    }
}
