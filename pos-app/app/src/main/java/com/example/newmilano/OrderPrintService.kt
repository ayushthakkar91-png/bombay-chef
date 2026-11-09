package com.example.newmilano

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.sunmi.peripheral.printer.InnerPrinterCallback
import com.sunmi.peripheral.printer.InnerPrinterManager
import com.sunmi.peripheral.printer.InnerResultCallback
import com.sunmi.peripheral.printer.SunmiPrinterService
import kotlinx.coroutines.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * ORDER PRINT SERVICE (foreground)
 *
 * Owns order polling and receipt printing so they survive the device sleeping,
 * the app being backgrounded, and most OEM battery killers. Holds a partial wake
 * lock and shows an ongoing notification (required for a foreground service).
 *
 * Reliability rules carried over from the fix:
 *  - confirm-before-mark: only mark an order printed once the printer confirms;
 *  - failed prints stay unprinted and auto-retry next poll (never lost);
 *  - in-flight guard prevents duplicate prints during the retry window.
 */
class OrderPrintService : Service() {

    companion object {
        const val ACTION_START = "com.example.newmilano.START"
        const val ACTION_STOP = "com.example.newmilano.STOP"
        const val ACTION_REPRINT = "com.example.newmilano.REPRINT"
        const val ACTION_POLL_NOW = "com.example.newmilano.POLL_NOW"
        const val EXTRA_ORDER_JSON = "order_json"
        const val EXTRA_REPRINT_ORDER_ID = "reprint_order_id"
        private const val CHANNEL_ID = "milano_orders"
        private const val NOTIF_ID = 1001
        private val SERVER_URL = BuildConfig.SERVER_URL
        // Adaptive poll cadence (battery): fast while orders are active, slow when idle.
        private const val ACTIVE_POLL_MS = 5000L
        private const val IDLE_POLL_MS = 20000L
    }

    private val client = OkHttpClient.Builder().connectTimeout(20, TimeUnit.SECONDS).build()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var pollingJob: Job? = null
    private var alarmJob: Job? = null
    // Current poll interval — see startPolling(); updated each poll from order activity.
    @Volatile private var pollIntervalMs: Long = ACTIVE_POLL_MS
    private var wakeLock: PowerManager.WakeLock? = null
    private val toneGenerator = ToneGenerator(AudioManager.STREAM_ALARM, 100)

    private var sunmiPrinterService: SunmiPrinterService? = null
    private val printingInFlight = ConcurrentHashMap.newKeySet<String>()
    // Orders the admin explicitly asked to reprint (via FCM). Bypasses both the
    // printedIds guard and the auto-print baseline for exactly one print.
    private val reprintRequested = ConcurrentHashMap.newKeySet<String>()
    private var knownIds = emptySet<String>()

    // Auto-print cut-off (epoch ms). Orders created at/before this are treated as
    // pre-existing backlog and are NOT auto-printed — this stops the whole order
    // history being dumped to the printer when staff log in or reinstall. Set on
    // the first poll and persisted so it survives restarts (new orders still print).
    private var printBaselineMs: Long = 0L
    private var baselineInitialized: Boolean = false

    // Persisted per-device log of order IDs already sent to the printer. This is the
    // REAL "print once" guard: it survives service restarts AND a failed server
    // "mark printed" call. The Sunmi result callback is unreliable (it can report
    // failure after a receipt physically printed), which otherwise caused an
    // infinite re-print loop. Capped to the last 500 ids so it can't grow unbounded.
    private val printedIds = LinkedHashSet<String>()

    private val printerCallback = object : InnerPrinterCallback() {
        override fun onConnected(service: SunmiPrinterService?) {
            sunmiPrinterService = service
            OrderStore.printerReady.value = true
        }
        override fun onDisconnected() {
            sunmiPrinterService = null
            OrderStore.printerReady.value = false
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        SettingsStore.init(this)
        printBaselineMs = getSharedPreferences("pos_settings", Context.MODE_PRIVATE).getLong("printBaselineMs", 0L)
        baselineInitialized = printBaselineMs > 0L
        loadPrintedIds()
        createChannel()
        try { InnerPrinterManager.getInstance().bindService(this, printerCallback) } catch (e: Exception) {}
        acquireWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification("Listening for orders"))
        when (intent?.action) {
            ACTION_STOP -> {
                stopAlarmLoop()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_REPRINT -> {
                val json = intent.getStringExtra(EXTRA_ORDER_JSON)
                if (json != null) {
                    try {
                        val o = JSONObject(json)
                        val id = o.optString("_id")
                        // A reprint must also clear the "NOT PRINTED" badge: record it
                        // locally and mark it printed on the server once submitted.
                        printNow(o) { success, reason ->
                            if (success && id.isNotEmpty()) {
                                recordPrinted(id); mark(id)
                            } else if (!success) {
                                // Staff pressed REPRINT and nothing came out — say why
                                // instead of silently doing nothing.
                                updateNotification(reason ?: "Print failed — check the printer")
                            }
                        }
                    } catch (e: Exception) {}
                }
            }
            ACTION_POLL_NOW -> {
                // FCM push arrived — ensure polling is running and poll right now
                // so the ticket prints without waiting for the next 5s tick.
                // An admin "Reprint" carries the order id: forget that we printed
                // it so the poll below prints it again (previously the permanent
                // printedIds guard silently refused every admin reprint).
                val reprintId = intent.getStringExtra(EXTRA_REPRINT_ORDER_ID)
                if (!reprintId.isNullOrEmpty()) {
                    clearPrinted(reprintId)
                    reprintRequested.add(reprintId)
                }
                startPolling()
                scope.launch { pollOnce() }
            }
            else -> startPolling()
        }
        // START_STICKY: the OS restarts the service if it's killed
        return START_STICKY
    }

    private fun token(): String =
        getSharedPreferences("milano_pos", Context.MODE_PRIVATE).getString("jwt_token", "") ?: ""

    private enum class ReauthResult { OK, REJECTED, NETWORK }

    /**
     * Silent re-login using securely-stored staff credentials. POS terminals are
     * always-on, so their JWT (24h admin / 7d staff) expires during normal use;
     * without this the poll loop would 401 forever and the UI would sit on
     * "Reconnecting…" until a manual logout/login. On success the fresh token is
     * written back to prefs and the next poll uses it. REJECTED means the creds
     * themselves are no longer valid (force manual login); NETWORK means a
     * transient failure (keep retrying, don't log the user out).
     */
    private fun reauth(): ReauthResult {
        val creds = SecureCreds.load(this) ?: return ReauthResult.REJECTED
        return try {
            val body = JSONObject().apply { put("email", creds.first); put("password", creds.second) }
            val req = Request.Builder()
                .url("$SERVER_URL/auth/login")
                .post(body.toString().toRequestBody("application/json".toMediaType()))
                .build()
            client.newCall(req).execute().use { r ->
                when {
                    r.isSuccessful -> {
                        val tok = JSONObject(r.body?.string() ?: "{}").optString("token", "")
                        if (tok.isNotEmpty()) {
                            getSharedPreferences("milano_pos", Context.MODE_PRIVATE)
                                .edit().putString("jwt_token", tok).apply()
                            ReauthResult.OK
                        } else ReauthResult.NETWORK
                    }
                    r.code == 401 || r.code == 400 -> ReauthResult.REJECTED
                    else -> ReauthResult.NETWORK
                }
            }
        } catch (e: Exception) {
            ReauthResult.NETWORK
        }
    }

    // New orders arrive via FCM push (ACTION_POLL_NOW -> immediate poll), so this
    // timed loop is a fallback. It runs fast (5s) while orders are being handled and
    // backs off (20s) when the kitchen is idle — cutting idle radio wakeups ~4x.
    // Worst case a dropped push still prints within one idle interval.
    private fun startPolling() {
        if (pollingJob?.isActive == true) return
        pollingJob = scope.launch {
            while (isActive) {
                pollOnce()
                delay(pollIntervalMs)
            }
        }
    }

    /** One poll cycle: fetch orders, print unprinted ones, drive the alarm. */
    private suspend fun pollOnce() {
        val jwt = token()
        if (jwt.isEmpty()) return
        try {
            val request = Request.Builder()
                .url("$SERVER_URL/orders/poll/${BuildConfig.LOCATION_SLUG}")
                .addHeader("Authorization", "Bearer $jwt")
                .build()
            client.newCall(request).execute().use { r ->
                if (r.isSuccessful) {
                    OrderStore.connected.value = true
                    val arr = JSONObject(r.body?.string() ?: "{}").getJSONArray("orders")
                    val parsed = ArrayList<OrderRow>(arr.length())
                    var newPending = false
                    val currentIds = HashSet<String>()
                    var maxCreatedMs = 0L
                    for (i in 0 until arr.length()) {
                        val o = arr.getJSONObject(i)
                        val id = o.getString("_id")
                        currentIds.add(id)
                        val isPrnt = o.optBoolean("isPrinted", false)
                        val status = o.getString("status")
                        val createdMs = parseIsoMillis(o.optString("createdAt"))
                        if (createdMs != null && createdMs > maxCreatedMs) maxCreatedMs = createdMs
                        parsed.add(
                            OrderRow(
                                id, o.getString("orderNumber"), o.getString("customerName"),
                                o.getDouble("totalPrice"), status, isPrnt,
                                o.getString("paymentStatus") == "paid",
                                o.optString("orderType", "collection"), o
                            )
                        )
                        // Only auto-print orders NEWER than the baseline captured at first
                        // login/start. Prevents dumping the whole backlog of pre-existing
                        // unprinted orders to the printer on login/reinstall. Older orders
                        // stay on screen and can be reprinted manually. An explicit admin
                        // reprint bypasses the baseline for exactly that order.
                        val isAdminReprint = reprintRequested.contains(id)
                        val newerThanBaseline = baselineInitialized && createdMs != null && createdMs > printBaselineMs
                        if (!isPrnt && !hasPrinted(id) && (isAdminReprint || newerThanBaseline)) {
                            // in-flight guard (this poll cycle) + persistent print-once guard
                            if (printingInFlight.add(id)) {
                                printNow(o) { success, reason ->
                                    if (success) {
                                        // Record locally FIRST — a service restart or a failed
                                        // server mark can then never re-print this order.
                                        reprintRequested.remove(id)
                                        recordPrinted(id)
                                        // printedIds is now the permanent guard, so drop the
                                        // per-cycle in-flight marker instead of leaking it
                                        // forever (it grew unbounded over long uptimes).
                                        printingInFlight.remove(id)
                                        mark(id) // sync 'printed' to the server (best effort, retries)
                                    } else {
                                        // Printer unbound or in a hard error state (paper out /
                                        // cover open / overheat) — retry next poll, tell the server.
                                        printingInFlight.remove(id)
                                        reportPrintFailed(id, reason ?: "Printer unavailable")
                                    }
                                }
                            }
                        }
                        // A brand-new order still awaiting acceptance re-arms the alarm.
                        if (status == "pending" && !knownIds.contains(id)) newPending = true
                    }
                    knownIds = currentIds
                    // First poll with no stored baseline: adopt the newest existing order's
                    // timestamp as the cut-off so nothing already on the server prints now.
                    // If there are no orders yet, baseline stays 0 so the first real order
                    // still prints (clock-independent — no risk of a stuck future cut-off).
                    // Persisted so a later restart doesn't re-dump the backlog either.
                    if (!baselineInitialized) {
                        printBaselineMs = maxCreatedMs
                        baselineInitialized = true
                        try {
                            getSharedPreferences("pos_settings", Context.MODE_PRIVATE)
                                .edit().putLong("printBaselineMs", printBaselineMs).apply()
                        } catch (e: Exception) {}
                    }
                    if (newPending) {
                        OrderStore.alarmMuted.value = false
                        updateNotification("New order received")
                    }
                    // Sound continuously while any order awaits acceptance (status ==
                    // pending), unless muted. Stops itself once all are accepted.
                    val hasPending = parsed.any { it.status == "pending" }
                    if (hasPending && !OrderStore.alarmMuted.value && SettingsStore.soundEnabled.value) startAlarmLoop() else stopAlarmLoop()
                    // Battery: poll fast only while orders are actively handled (pending
                    // or preparing). Idle periods rely on the instant FCM push for new
                    // orders, so a slower fallback poll costs no real ticket latency.
                    pollIntervalMs = if (parsed.any { it.status == "pending" || it.status == "preparing" }) ACTIVE_POLL_MS else IDLE_POLL_MS
                    withContext(Dispatchers.Main) {
                        OrderStore.orders.clear()
                        OrderStore.orders.addAll(parsed)
                    }
                    // Keep the printer advisory banner live + self-clearing.
                    refreshPrinterAdvisory()
                } else if (r.code == 401) {
                    // Token expired — try a silent re-login with stored creds.
                    when (reauth()) {
                        // Fresh token saved; the next poll (5s) fetches orders with it.
                        ReauthResult.OK -> OrderStore.connected.value = true
                        // Creds no longer valid — surface the login screen.
                        ReauthResult.REJECTED -> {
                            OrderStore.connected.value = false
                            OrderStore.sessionExpired.value = true
                        }
                        // Transient failure — keep the poll loop retrying.
                        ReauthResult.NETWORK -> OrderStore.connected.value = false
                    }
                } else {
                    OrderStore.connected.value = false
                }
            }
        } catch (e: Exception) {
            OrderStore.connected.value = false
        }
    }

    /** Repeats the alarm tone until stopped (all orders accepted, or muted). */
    private fun startAlarmLoop() {
        if (alarmJob?.isActive == true) return
        alarmJob = scope.launch {
            while (isActive) {
                // Re-check each beat so tapping mute (or disabling sound) silences it within one cycle.
                if (OrderStore.alarmMuted.value || !SettingsStore.soundEnabled.value) break
                try { toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP2) } catch (e: Exception) {}
                delay(3000)
            }
        }
    }

    private fun stopAlarmLoop() {
        alarmJob?.cancel()
        alarmJob = null
    }

    /**
     * Print a receipt. Sunmi prints synchronously when the buffer is committed, and
     * its async result callback is unreliable — some firmware reports failure AFTER a
     * receipt has physically printed, which caused an infinite re-print loop. So we
     * treat a clean submit (printer bound, no exception) as success: onComplete(true).
     * onComplete(false) only when the printer is unbound or committing throws.
     */
    /**
     * Maps the Sunmi printer state to a clear, staff-facing instruction, replacing
     * the SDK's cryptic "device is open" toast. Advisory only — the caller never
     * blocks printing on this. Codes follow the common Sunmi updatePrinterState()
     * mapping; if a specific model reports a different code for an open top, adjust
     * the `6 ->` case after confirming the value on the device.
     */
    private fun printerAdvisory(prnt: SunmiPrinterService): String? {
        return try {
            when (prnt.updatePrinterState()) {
                4 -> "Printer out of paper — load paper to print"
                5 -> "Printer overheated — wait a moment, then print"
                6 -> "Close the printer top to print"
                3, 505, 507 -> "Printer not connected — check the printer"
                else -> null // 1 normal / 2 preparing / unknown -> no banner
            }
        } catch (e: Exception) {
            null
        }
    }

    /** Refresh the advisory banner from the live printer state (self-clearing). */
    private fun refreshPrinterAdvisory() {
        val prnt = sunmiPrinterService ?: return
        val msg = printerAdvisory(prnt) ?: ""
        if (OrderStore.printerMessage.value != msg) {
            OrderStore.printerMessage.value = msg
            if (msg.isNotEmpty()) updateNotification(msg)
        }
    }

    private fun printNow(order: JSONObject, onComplete: ((Boolean, String?) -> Unit)?) {
        val prnt = sunmiPrinterService
        if (prnt == null) {
            try { InnerPrinterManager.getInstance().bindService(this, printerCallback) } catch (e: Exception) {}
            onComplete?.invoke(false, "Printer unavailable")
            return
        }
        // Immediate, clear feedback if the top is open / paper is out.
        refreshPrinterAdvisory()
        // HARD GATE: out of paper (4) / overheated (5) / cover open (6) physically
        // cannot print. Submitting anyway used to report success, mark the order
        // PRINTED everywhere and permanently lose the ticket. Refuse instead —
        // the order stays unprinted and the next poll retries once fixed.
        val state = try { prnt.updatePrinterState() } catch (e: Exception) { -1 }
        if (state == 4 || state == 5 || state == 6) {
            onComplete?.invoke(false, printerAdvisory(prnt) ?: "Printer not ready")
            return
        }
        val copies = SettingsStore.printCopies.value.coerceIn(1, 5)
        val small = SettingsStore.smallVersion.value
        try {
            prnt.enterPrinterBuffer(true)
            repeat(copies) {
                buildReceipt(prnt, order, small)
                prnt.lineWrap(if (small) 3 else 4, null)
            }
            // Commit to the printer. The callback is advisory only — NOT used to
            // decide success — because it can falsely report failure post-print.
            prnt.exitPrinterBufferWithCallback(true, object : InnerResultCallback() {
                override fun onRunResult(isSuccess: Boolean) {}
                override fun onReturnString(result: String?) {}
                override fun onRaiseException(code: Int, msg: String?) {}
                override fun onPrintResult(code: Int, msg: String?) {}
            })
            onComplete?.invoke(true, null)
        } catch (e: Exception) {
            onComplete?.invoke(false, e.message ?: "Print failed")
        }
    }

    private fun loadPrintedIds() {
        try {
            val raw = getSharedPreferences("pos_settings", Context.MODE_PRIVATE).getString("printedOrderIds", "") ?: ""
            if (raw.isNotEmpty()) synchronized(printedIds) { printedIds.addAll(raw.split(",").filter { it.isNotEmpty() }) }
        } catch (e: Exception) {}
    }

    private fun hasPrinted(id: String): Boolean = synchronized(printedIds) { printedIds.contains(id) }

    /** Forget a printed order so an explicit admin reprint can print it again. */
    private fun clearPrinted(id: String) {
        synchronized(printedIds) {
            if (printedIds.remove(id)) {
                try {
                    getSharedPreferences("pos_settings", Context.MODE_PRIVATE)
                        .edit().putString("printedOrderIds", printedIds.joinToString(",")).apply()
                } catch (e: Exception) {}
            }
        }
        printingInFlight.remove(id)
    }

    /** Record an order as printed on this device and persist (capped to last 500). */
    private fun recordPrinted(id: String) {
        synchronized(printedIds) {
            if (!printedIds.add(id)) return
            while (printedIds.size > 500) {
                val it = printedIds.iterator()
                if (it.hasNext()) { it.next(); it.remove() } else break
            }
            try {
                getSharedPreferences("pos_settings", Context.MODE_PRIVATE)
                    .edit().putString("printedOrderIds", printedIds.joinToString(",")).apply()
            } catch (e: Exception) {}
        }
    }

    /** Lays out one receipt into the print buffer. Font sizes shrink in "small" mode. */
    private fun buildReceipt(prnt: SunmiPrinterService, order: JSONObject, small: Boolean) {
        val s = SettingsStore
        val big = if (small) 32f else 40f
        val norm = if (small) 22f else 26f
        val tiny = if (small) 18f else 22f

        // ---- Header: shop name + address ----
        prnt.setAlignment(1, null)
        if (s.printLogo.value) {
            trySetFont(prnt, big)
            // 58mm paper fits about 16 double-width characters per line, and the
            // full name is 19 - printing it on one line cut off the "CHEF".
            prnt.printText("BOMBAY\n", null)
            prnt.printText("BICYCLE CHEF\n", null)
        }
        if (s.printAddress.value) {
            trySetFont(prnt, tiny)
            prnt.printText("88 Balham High Road, SW12 9AG\n", null)
            prnt.printText("Tel: 020 8772 3222\n", null)
        }

        // ---- Type + time (prominent, centered) ----
        trySetFont(prnt, norm)
        prnt.printText("--------------------------------\n", null)
        trySetFont(prnt, big)
        prnt.printText("${orderTypeLabel(order.optString("orderType"))}\n", null)
        trySetFont(prnt, norm)
        val created = order.optString("createdAt", "")
        val t = formatTime(created); val d = formatDate(created)
        if (t.isNotEmpty() || d.isNotEmpty()) prnt.printText("$t   $d\n", null)

        // ---- Order + customer ----
        prnt.setAlignment(0, null)
        prnt.printText("--------------------------------\n", null)
        prnt.printText("Order #${order.optString("orderNumber")}\n", null)
        prnt.printText("Customer: ${order.optString("customerName")}\n", null)
        val phone = order.optString("customerPhone", "")
        if (phone.isNotEmpty()) prnt.printText("Phone: $phone\n", null)

        // ---- Delivery address (delivery only) ----
        if (isDelivery(order.optString("orderType"))) {
            val addr = addressLine(order)
            if (addr.isNotEmpty()) prnt.printText("Address: $addr\n", null)
            val notes = addressNotes(order)
            if (notes.isNotEmpty()) prnt.printText("Note: $notes\n", null)
        }

        // ---- Items (optionally grouped by category) ----
        prnt.printText("--------------------------------\n", null)
        val items = order.optJSONArray("orderItems")
        if (items != null) {
            if (s.printCategories.value) {
                val byCat = LinkedHashMap<String, MutableList<JSONObject>>()
                for (i in 0 until items.length()) {
                    val itm = items.getJSONObject(i)
                    val cat = itm.optString("category", "").ifBlank { "ITEMS" }
                    byCat.getOrPut(cat) { mutableListOf() }.add(itm)
                }
                for ((cat, list) in byCat) {
                    prnt.printText("$cat\n", null)
                    for (itm in list) printItemLine(prnt, itm)
                }
            } else {
                for (i in 0 until items.length()) printItemLine(prnt, items.getJSONObject(i))
            }
        }

        // ---- Order-level note ----
        val si = order.optString("specialInstructions", "")
        if (si.isNotEmpty()) {
            prnt.printText("--------------------------------\n", null)
            prnt.printText("NOTE: $si\n", null)
        }

        // ---- Totals breakdown (subtotal, delivery, discount + promo) + TOTAL ----
        prnt.printText("--------------------------------\n", null)
        val subtotal = order.optDouble("subtotal", 0.0)
        val deliveryFee = order.optDouble("deliveryFee", 0.0)
        val discount = order.optDouble("discount", 0.0)
        val promo = order.optString("promoCode", "")
        if (subtotal > 0.0) prnt.printText("Subtotal  £${money(subtotal)}\n", null)
        if (deliveryFee > 0.0) prnt.printText("Delivery  £${money(deliveryFee)}\n", null)
        if (discount > 0.0) {
            val label = if (promo.isNotEmpty()) "Discount ($promo)" else "Discount"
            prnt.printText("$label  -£${money(discount)}\n", null)
        } else if (promo.isNotEmpty()) {
            // Promo applied with no monetary discount (e.g. free item / free delivery) — still show it.
            prnt.printText("Promo: $promo\n", null)
        }
        trySetFont(prnt, big)
        prnt.printText("TOTAL  £${money(order.optDouble("totalPrice", 0.0))}\n", null)
        trySetFont(prnt, norm)
        val paid = order.optString("paymentStatus", "") == "paid"
        prnt.printText(if (paid) "PAID (CARD)\n" else "CASH - UNPAID\n", null)

        // ---- Footer: app version ----
        if (s.printVersion.value) {
            prnt.setAlignment(1, null)
            trySetFont(prnt, tiny)
            prnt.printText("POS v${appVersion()}\n", null)
        }
        trySetFont(prnt, norm)
        prnt.setAlignment(0, null)
    }

    private fun printItemLine(prnt: SunmiPrinterService, itm: JSONObject) {
        val qty = itm.optInt("quantity", 1)
        val name = itm.optString("productName")
        prnt.printText("${qty}x $name  £${money(itm.optDouble("price", 0.0))}\n", null)

        // Size + base the kitchen must actually make.
        val size = itm.optJSONObject("selectedSize")?.optString("name", "").orEmpty()
        if (size.isNotEmpty()) prnt.printText("   Size: $size\n", null)
        val base = itm.optJSONObject("selectedBase")?.optString("name", "").orEmpty()
        if (base.isNotEmpty()) prnt.printText("   Base: $base\n", null)

        // Toppings (name + qty; price isn't needed on a kitchen ticket).
        val tops = itm.optJSONArray("selectedToppings")
        if (tops != null) for (i in 0 until tops.length()) {
            val t = tops.getJSONObject(i)
            val tn = t.optString("name", "")
            if (tn.isNotEmpty()) {
                val tq = t.optInt("quantity", 1)
                prnt.printText("   + $tn${if (tq > 1) " x$tq" else ""}\n", null)
            }
        }

        // Dips.
        val dips = itm.optJSONArray("selectedDips")
        if (dips != null) for (i in 0 until dips.length()) {
            val dn = dips.getJSONObject(i).optString("name", "")
            if (dn.isNotEmpty()) prnt.printText("   Dip: $dn\n", null)
        }

        // Meal-deal / bundle picks. selectedOptions is an OBJECT keyed by
        // group/section name — { "Choose Pizza": [{name,price}], ... } — NOT an
        // array. Reading it as an array (optJSONArray) returned null, so bundle
        // contents never printed and the kitchen saw an empty meal deal.
        val opts = itm.optJSONObject("selectedOptions")
        if (opts != null) {
            val groups = opts.keys()
            while (groups.hasNext()) {
                val group = groups.next()
                val picks = opts.optJSONArray(group) ?: continue
                for (i in 0 until picks.length()) {
                    val o = picks.optJSONObject(i) ?: continue
                    val line = o.optString("name", o.optString("productName", ""))
                    if (line.isNotEmpty()) prnt.printText("   * $group: $line\n", null)
                }
            }
        }

        // Meal-deal drink stored on its own field (older bundle shape).
        val drink = itm.optJSONObject("selectedDrink")?.optString("name", "").orEmpty()
        if (drink.isNotEmpty()) prnt.printText("   * Drink: $drink\n", null)

        // Per-item note (e.g. "no onions").
        val si = itm.optString("specialInstructions", "")
        if (si.isNotEmpty()) prnt.printText("   Note: $si\n", null)
    }

    /** setFontSize isn't on every Sunmi firmware — never let a missing font size abort a print. */
    private fun trySetFont(prnt: SunmiPrinterService, size: Float) {
        try { prnt.setFontSize(size, null) } catch (e: Throwable) { /* keep current size */ }
    }

    private fun appVersion(): String = try {
        packageManager.getPackageInfo(packageName, 0).versionName ?: "?"
    } catch (e: Exception) { "?" }

    private fun mark(id: String, attempt: Int = 0) {
        scope.launch {
            try {
                val r = client.newCall(
                    Request.Builder()
                        .url("$SERVER_URL/orders/$id/printed")
                        .addHeader("Authorization", "Bearer ${token()}")
                        .patch("".toRequestBody())
                        .build()
                ).execute()
                val ok = r.isSuccessful
                r.close()
                // The paper already printed. If the server didn't record it, retry the
                // mark so the order doesn't show "unprinted" forever. The id stays in
                // printingInFlight, so it is never re-printed — only the mark retries.
                if (!ok && attempt < 5) { delay(3000); mark(id, attempt + 1) }
            } catch (e: Exception) {
                if (attempt < 5) { delay(3000); mark(id, attempt + 1) }
            }
        }
    }

    private fun reportPrintFailed(id: String, error: String) {
        scope.launch {
            try {
                val json = JSONObject().apply { put("error", error) }
                client.newCall(
                    Request.Builder()
                        .url("$SERVER_URL/orders/$id/print-failed")
                        .addHeader("Authorization", "Bearer ${token()}")
                        .patch(json.toString().toRequestBody("application/json".toMediaType()))
                        .build()
                ).execute().close()
            } catch (e: Exception) {}
        }
    }

    private fun acquireWakeLock() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "milano:print").apply {
                setReferenceCounted(false)
                acquire()
            }
        } catch (e: Exception) {}
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL_ID, "Order printing", NotificationManager.IMPORTANCE_LOW)
            ch.setShowBadge(false)
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
        }
    }

    private fun buildNotification(text: String): Notification {
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Bombay Bicycle Chef POS")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .setOngoing(true)
            .setContentIntent(pi)
            .build()
    }

    private fun updateNotification(text: String) {
        try {
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .notify(NOTIF_ID, buildNotification(text))
        } catch (e: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAlarmLoop()
        pollingJob?.cancel()
        scope.cancel()
        try { wakeLock?.release() } catch (e: Exception) {}
        // Release the native audio resource — previously leaked on every service
        // teardown/restart (ToneGenerator holds an AudioTrack under the hood).
        try { toneGenerator.release() } catch (e: Exception) {}
        try { InnerPrinterManager.getInstance().unBindService(this, printerCallback) } catch (e: Exception) {}
        OrderStore.connected.value = false
        OrderStore.printerReady.value = false
    }
}
