package com.example.newmilano

import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.snapshotFlow
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.newmilano.ui.theme.NewMilanoTheme
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class OrderRow(
    val id: String,
    val number: String,
    val name: String,
    val total: Double,
    val status: String,
    val isPrinted: Boolean,
    val isPaid: Boolean,
    val orderType: String,
    val rawJson: JSONObject
)

/** Orders rendered per page. Ten fills a terminal screen with room to spare. */
private const val PAGE_SIZE = 10

class MainActivity : ComponentActivity() {

    // THE CLOUD BRAIN
    private val SERVER_URL = BuildConfig.SERVER_URL

    // Polling + printing now live in OrderPrintService (a foreground service) so
    // they survive the device sleeping / app backgrounding. This Activity only
    // renders the UI (reading OrderStore) and issues status updates.
    private val client = OkHttpClient.Builder().connectTimeout(20, TimeUnit.SECONDS).build()

    private val jwtToken = mutableStateOf("")
    private val showSettings = mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        SettingsStore.init(this)

        // POS DURABILITY: KEEP SCREEN ON & LOCK PORTRAIT
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT

        // REMEMBER ME: Check for saved login
        val prefs = getSharedPreferences("milano_pos", MODE_PRIVATE)
        val savedToken = prefs.getString("jwt_token", "")
        if (!savedToken.isNullOrEmpty()) {
            jwtToken.value = savedToken
        }

        // If already logged in, make sure the print service is running and this
        // device's FCM token is registered with the backend for order pushes.
        if (jwtToken.value.isNotEmpty()) {
            startPrintService()
            DeviceRegistrar.register(this, jwtToken.value)
        }

        enableEdgeToEdge()
        setContent {
            NewMilanoTheme {
                val token by remember { jwtToken }
                Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFFF3F4F6)) {
                    when {
                        token.isEmpty() -> LoginScreen()
                        showSettings.value -> SettingsScreen(onBack = { showSettings.value = false })
                        else -> DashboardScreen()
                    }
                }
            }
        }
    }

    @Composable
    fun LoginScreen() {
        var email by remember { mutableStateOf("") }
        var password by remember { mutableStateOf("") }
        var loading by remember { mutableStateOf(false) }
        var errorMsg by remember { mutableStateOf("") }

        Column(modifier = Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
            Image(
                painter = painterResource(id = R.drawable.app_logo),
                contentDescription = "Bombay Bicycle Chef",
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxWidth(0.85f).height(110.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text("KITCHEN TERMINAL", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Color(0xFF1F2937))
            Text("Staff Login", color = Color.Gray, fontSize = 14.sp)

            if (errorMsg.isNotEmpty()) {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)), modifier = Modifier.padding(vertical = 16.dp)) {
                    Text(errorMsg, color = Color.Red, modifier = Modifier.padding(8.dp), fontSize = 12.sp)
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
            OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Password") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            Spacer(modifier = Modifier.height(32.dp))

            Button(onClick = { loading = true; errorMsg = ""; performLogin(email, password) { s, m -> loading = false; if(!s) errorMsg = m } }, modifier = Modifier.fillMaxWidth().height(56.dp), enabled = !loading, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF5722))) {
                if(loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp)) else Text("SIGN IN")
            }
        }
    }

    @Composable
    fun DashboardScreen() {
        var selectedOrder by remember { mutableStateOf<OrderRow?>(null) }
        val token by remember { jwtToken }

        LaunchedEffect(token) { if (token.isNotEmpty()) startPrintService() }

        // The service auto-refreshes an expired token in the background. It only
        // sets sessionExpired when a silent re-login was DEFINITIVELY rejected
        // (creds changed/disabled) — then we drop to the login screen rather than
        // leaving staff on a stuck "Reconnecting…".
        val expired by OrderStore.sessionExpired
        LaunchedEffect(expired) {
            if (expired) {
                getSharedPreferences("milano_pos", MODE_PRIVATE).edit().remove("jwt_token").apply()
                SecureCreds.clear(this@MainActivity)
                stopPrintService()
                jwtToken.value = ""
                OrderStore.sessionExpired.value = false
            }
        }

        val online by OrderStore.connected
        val todayOnly by SettingsStore.showTodayOnly
        val hideConfirmed by SettingsStore.hideConfirmed

        // Live filtered view: today-only + hide-confirmed come from Settings.
        // Newest first: the server sends oldest-first (the order to cook in), but on
        // a terminal the thing that just arrived is the thing staff are looking for,
        // and it was landing underneath everything else.
        val visible = OrderStore.orders
            .filter { o ->
                (!todayOnly || isToday(o.rawJson.optString("createdAt"))) &&
                (!hideConfirmed || o.status != "confirmed")
            }
            .sortedByDescending { parseIsoMillis(it.rawJson.optString("createdAt")) ?: 0L }

        // Render a page at a time. The service still polls EVERY live order —
        // it has to, or a ticket further down the list would never print — but
        // the screen only builds what staff are actually looking at, and grows
        // as they scroll.
        val listState = rememberLazyListState()
        var shown by remember { mutableStateOf(PAGE_SIZE) }

        // A new filter or a shorter list starts again from the first page.
        LaunchedEffect(todayOnly, hideConfirmed) { shown = PAGE_SIZE }

        // Extend when the last rendered card comes into view.
        LaunchedEffect(listState, visible.size) {
            snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0 }
                .collect { last -> if (last >= shown - 2 && shown < visible.size) shown += PAGE_SIZE }
        }

        val page by remember(visible, shown) { derivedStateOf { visible.take(shown) } }

        Column(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.fillMaxWidth().background(Color(0xFF1F2937)).padding(top = 40.dp, bottom = 12.dp, start = 16.dp, end = 8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("BOMBAY BICYCLE CHEF", color = Color.White, fontWeight = FontWeight.Black, fontSize = 18.sp)
                        Text(if (online) "● Online Hub" else "○ Reconnecting…", color = if (online) Color(0xFF4CAF50) else Color(0xFFFFB300), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                    // Mute / unmute the new-order alarm. A brand-new order re-arms it.
                    val muted by OrderStore.alarmMuted
                    Text(
                        if (muted) "🔕" else "🔔",
                        fontSize = 22.sp,
                        modifier = Modifier
                            .clickable { OrderStore.alarmMuted.value = !OrderStore.alarmMuted.value }
                            .padding(horizontal = 8.dp)
                    )
                    IconButton(onClick = { showSettings.value = true }) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings", tint = Color.White)
                    }
                    IconButton(onClick = {
                        val prefs = getSharedPreferences("milano_pos", MODE_PRIVATE)
                        prefs.edit().clear().apply()
                        SecureCreds.clear(this@MainActivity)
                        // Also drop the auto-print cut-off. It survives an
                        // install-over-the-top, and a stale value silently
                        // stops new orders from auto-printing.
                        getSharedPreferences("pos_settings", MODE_PRIVATE).edit().remove("printBaselineMs").apply()
                        jwtToken.value = ""; stopPrintService()
                    }) { Icon(Icons.Default.ExitToApp, contentDescription = "Log out", tint = Color.White) }
                }
            }
            // Advisory printer banner (e.g. top open / out of paper) — a clear,
            // actionable instruction instead of the SDK's cryptic "device is open".
            val printerMsg by OrderStore.printerMessage
            if (printerMsg.isNotEmpty()) {
                Box(modifier = Modifier.fillMaxWidth().background(Color(0xFFD32F2F)).padding(horizontal = 16.dp, vertical = 10.dp)) {
                    Text("⚠  $printerMsg", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }
            // Today / All filter + live counts
            Row(modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                FilterChipBtn("TODAY", todayOnly) { SettingsStore.toggle("showTodayOnly", SettingsStore.showTodayOnly, true) }
                FilterChipBtn("ALL", !todayOnly) { SettingsStore.toggle("showTodayOnly", SettingsStore.showTodayOnly, false) }
                Spacer(Modifier.weight(1f))
                StatChip("SHOWN", visible.size.toString(), Color(0xFF2196F3))
                StatChip("NEW", visible.count { it.status == "pending" }.toString(), Color(0xFFFF5722))
            }
            if (visible.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(if (todayOnly) "No orders today yet" else "No orders", color = Color.Gray)
                }
            } else {
                LazyColumn(state = listState, modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    // Keyed by order id: without this every poll rebuilds every row, because the
                    // list is replaced wholesale and Compose cannot tell the rows apart.
                    items(page, key = { it.id }) { order -> OrderCard(order, onClick = { selectedOrder = order }) }
                    if (shown < visible.size) {
                        item {
                            Text(
                                "Scroll for ${visible.size - shown} more…",
                                color = Color.Gray,
                                fontSize = 13.sp,
                                modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }
        }
        selectedOrder?.let { order -> OrderDetailDialog(order = order, onDismiss = { selectedOrder = null }) }
    }

    @Composable
    fun FilterChipBtn(label: String, active: Boolean, onClick: () -> Unit) {
        Surface(
            color = if (active) Color(0xFFFF5722) else Color(0xFFE5E7EB),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.clickable { onClick() }
        ) {
            Text(
                label,
                color = if (active) Color.White else Color(0xFF374151),
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
            )
        }
    }

    @Composable
    fun StatChip(label: String, value: String, color: Color) {
        Card(modifier = Modifier.height(40.dp), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f))) {
            Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = color)
                Spacer(modifier = Modifier.width(4.dp))
                Text(value, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = color)
            }
        }
    }

    @Composable
    fun OrderCard(order: OrderRow, onClick: () -> Unit) {
        val created = order.rawJson.optString("createdAt", "")
        val delivery = isDelivery(order.orderType)
        val typeColor = if (delivery) Color(0xFFE53935) else Color(0xFF1E88E5)
        val accentColor = when(order.status) { "pending" -> Color(0xFFFF5722); "preparing" -> Color(0xFFFFB300); else -> Color(0xFF4CAF50) }
        // Tapping anywhere on the card opens the order. Staff reach for the card,
        // not the small button at the bottom of it.
        Card(modifier = Modifier.fillMaxWidth().clickable { onClick() }, shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
                Box(modifier = Modifier.width(6.dp).fillMaxHeight().background(accentColor))
                Column(modifier = Modifier.padding(start = 14.dp, top = 12.dp, end = 12.dp, bottom = 12.dp)) {
                    // Row 1: time (big) + type badge
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(formatTime(created).ifEmpty { "--:--" }, fontWeight = FontWeight.Black, fontSize = 22.sp)
                        // How long this order has been waiting — the thing that decides
                        // what to cook next. Hidden when the figure is implausible, so a
                        // terminal with a wrong date shows nothing rather than a lie.
                        val waited = parseIsoMillis(created)?.let { (System.currentTimeMillis() - it) / 60000L }
                        if (waited != null && waited in 0..600) {
                            val waitBg = when {
                                waited >= 25L -> Color(0xFFFBE9E7)
                                waited >= 10L -> Color(0xFFFDF1DD)
                                else -> Color(0xFFF1F3F5)
                            }
                            val waitFg = when {
                                waited >= 25L -> Color(0xFF8A2208)
                                waited >= 10L -> Color(0xFF7A5312)
                                else -> Color(0xFF5A6270)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(color = waitBg, shape = RoundedCornerShape(6.dp)) {
                                Text("${waited}m", color = waitFg, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }
                        Spacer(modifier = Modifier.weight(1f))
                        Surface(color = typeColor, shape = RoundedCornerShape(6.dp)) {
                            Text(orderTypeLabel(order.orderType), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    // Customer name
                    Text(order.name, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1F2937))
                    // Delivery address (delivery only)
                    if (delivery) {
                        val addr = addressLine(order.rawJson)
                        if (addr.isNotEmpty()) Text(addr, fontSize = 13.sp, color = Color.Gray)
                    }
                    // Date
                    val date = formatDate(created)
                    if (date.isNotEmpty()) Text(date, fontSize = 12.sp, color = Color.Gray)
                    Spacer(modifier = Modifier.height(8.dp))
                    // What was actually ordered — shown on the card so the kitchen can read a
                    // ticket without opening every order. Long lists are truncated.
                    val cardItems = order.rawJson.optJSONArray("orderItems")
                    if (cardItems != null && cardItems.length() > 0) {
                        val shown = minOf(cardItems.length(), 4)
                        for (i in 0 until shown) {
                            val itm = cardItems.getJSONObject(i)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("${itm.optInt("quantity", 1)}x", fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color(0xFF5D0925), modifier = Modifier.width(34.dp))
                                Text(itm.optString("productName"), fontSize = 15.sp, color = Color(0xFF1F2937), maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                        if (cardItems.length() > shown) {
                            Text("+${cardItems.length() - shown} more", fontSize = 13.sp, color = Color.Gray, modifier = Modifier.padding(start = 34.dp))
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    // Bottom row: #id + printed status + total
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("#${order.number}", fontWeight = FontWeight.Black, fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        if (order.isPrinted) StatusBadge("PRINTED", Color(0xFF4CAF50)) else StatusBadge("NOT PRINTED", Color(0xFFE53935))
                        // Coupon used — flag it at a glance; full code shows in the detail view + receipt.
                        val cardPromo = order.rawJson.optString("promoCode", "")
                        if (cardPromo.isNotEmpty()) {
                            Spacer(modifier = Modifier.width(6.dp))
                            StatusBadge("PROMO", Color(0xFF7A1732))
                        }
                        Spacer(modifier = Modifier.weight(1f))
                        Text("£${money(order.total)}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.Black)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    // The job in front of staff, on the card itself. Opening an order just to
                    // accept it costs two taps in a kitchen where hands are full.
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = onClick,
                            modifier = Modifier.weight(1f).height(44.dp),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1F2937))
                        ) { Text("VIEW", fontWeight = FontWeight.Bold) }

                        when (order.status) {
                            "pending" -> Button(
                                onClick = { updateStatus(order.id, "preparing") },
                                modifier = Modifier.weight(1.4f).height(44.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF5722))
                            ) { Text("ACCEPT", fontWeight = FontWeight.Bold) }

                            "preparing" -> Button(
                                onClick = { updateStatus(order.id, "ready") },
                                modifier = Modifier.weight(1.4f).height(44.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                            ) { Text("READY", fontWeight = FontWeight.Bold) }

                            // Already ready: nothing left to press here.
                            else -> {}
                        }
                    }
                }
            }
        }
    }

    @Composable
    fun StatusBadge(text: String, color: Color) {
        Surface(color = color.copy(alpha = 0.1f), shape = RoundedCornerShape(4.dp)) {
            Text(text, color = color, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
        }
    }

    @Composable
    fun OrderDetailDialog(order: OrderRow, onDismiss: () -> Unit) {
        Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            Card(modifier = Modifier.fillMaxWidth(0.95f).fillMaxHeight(0.9f), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Order Details", fontWeight = FontWeight.Black, fontSize = 22.sp, modifier = Modifier.weight(1f))
                        IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = null) }
                    }
                    Divider(modifier = Modifier.padding(vertical = 12.dp))
                    LazyColumn(modifier = Modifier.weight(1f)) {
                        item {
                            DetailRow("Customer", order.name, Icons.Default.Person)
                            DetailRow("Type", order.orderType.uppercase(), Icons.Default.Info)
                            DetailRow("Payment", if(order.isPaid) "PAID" else "CASH (PENDING)", Icons.Default.ThumbUp)

                            val notes = order.rawJson.optString("specialInstructions", "")
                            if(notes.isNotEmpty()) {
                                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF9C4)), modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                                    Row(modifier = Modifier.padding(12.dp)) {
                                        Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFA1887F))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("NOTE: $notes", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("ORDER ITEMS", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.Gray)
                        }
                        val items = order.rawJson.optJSONArray("orderItems")
                        if (items != null) {
                            items(items.length()) { i ->
                                val itm = items.getJSONObject(i)
                                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFFF9FAFB))) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text("${itm.optInt("quantity")}x ${itm.optString("productName")}", fontWeight = FontWeight.Bold)
                                        val sz = itm.optJSONObject("selectedSize")?.optString("name", "").orEmpty()
                                        val bs = itm.optJSONObject("selectedBase")?.optString("name", "").orEmpty()
                                        val sizeBase = listOf(sz, bs).filter { it.isNotEmpty() }.joinToString(" · ")
                                        if (sizeBase.isNotEmpty()) Text(sizeBase, fontSize = 12.sp, color = Color(0xFF374151))
                                        val tp = itm.optJSONArray("selectedToppings")
                                        if (tp != null && tp.length() > 0) {
                                            val names = (0 until tp.length()).mapNotNull { k ->
                                                val t = tp.optJSONObject(k) ?: return@mapNotNull null
                                                val n = t.optString("name", "")
                                                if (n.isEmpty()) null else { val q = t.optInt("quantity", 1); if (q > 1) "$n x$q" else n }
                                            }
                                            if (names.isNotEmpty()) Text("+ " + names.joinToString(", "), fontSize = 12.sp, color = Color(0xFFB45309))
                                        }
                                        Text("£${money(itm.optDouble("price"))}", fontSize = 12.sp, color = Color.Gray)
                                    }
                                }
                            }
                        }
                    }
                    Divider(modifier = Modifier.padding(vertical = 8.dp))
                    // Price breakdown incl. any promo/discount so staff can see a coupon was used.
                    val brkSub = order.rawJson.optDouble("subtotal", 0.0)
                    val brkDelivery = order.rawJson.optDouble("deliveryFee", 0.0)
                    val brkDiscount = order.rawJson.optDouble("discount", 0.0)
                    val brkPromo = order.rawJson.optString("promoCode", "")
                    if (brkSub > 0.0) BreakdownRow("Subtotal", "£${money(brkSub)}")
                    if (brkDelivery > 0.0) BreakdownRow("Delivery", "£${money(brkDelivery)}")
                    if (brkDiscount > 0.0) {
                        BreakdownRow(if (brkPromo.isNotEmpty()) "Discount ($brkPromo)" else "Discount", "-£${money(brkDiscount)}", accent = true)
                    } else if (brkPromo.isNotEmpty()) {
                        BreakdownRow("Promo code", brkPromo, accent = true)
                    }
                    Row(modifier = Modifier.fillMaxWidth().padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("TOTAL", fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                        Text("£${money(order.total)}", fontWeight = FontWeight.Black, fontSize = 22.sp)
                    }
                    Text(
                        if (order.isPaid) "PAID (CARD)" else "CASH — UNPAID",
                        color = if (order.isPaid) Color(0xFF4CAF50) else Color(0xFF2196F3),
                        fontWeight = FontWeight.Bold, fontSize = 13.sp,
                        modifier = Modifier.padding(top = 2.dp, bottom = 10.dp)
                    )
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { reprint(order.rawJson); onDismiss() }, modifier = Modifier.weight(1f).height(56.dp), colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)) {
                            Icon(Icons.Default.Build, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("REPRINT")
                        }
                        if (order.status == "pending") {
                            Button(onClick = { updateStatus(order.id, "preparing"); onDismiss() }, modifier = Modifier.weight(1f).height(56.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF5722))) { Text("ACCEPT") }
                        } else if (order.status == "preparing") {
                            Button(onClick = { updateStatus(order.id, "ready"); onDismiss() }, modifier = Modifier.weight(1f).height(56.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))) { Text("READY") }
                        }
                    }
                }
            }
        }
    }

    @Composable
    fun BreakdownRow(label: String, value: String, accent: Boolean = false) {
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(label, fontSize = 13.sp, color = if (accent) Color(0xFF7A1732) else Color.Gray, modifier = Modifier.weight(1f))
            Text(value, fontSize = 13.sp, fontWeight = if (accent) FontWeight.Bold else FontWeight.Medium, color = if (accent) Color(0xFF7A1732) else Color(0xFF374151))
        }
    }

    @Composable
    fun DetailRow(label: String, value: String, icon: ImageVector) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.Gray)
            Spacer(modifier = Modifier.width(12.dp))
            Column { Text(label, fontSize = 10.sp, color = Color.Gray); Text(value, fontWeight = FontWeight.Bold, fontSize = 14.sp) }
        }
    }

    @Composable
    fun SettingsScreen(onBack: () -> Unit) {
        val copies by SettingsStore.printCopies
        val gapSec by SettingsStore.printGapSec
        Column(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.fillMaxWidth().background(Color(0xFF1F2937)).padding(top = 40.dp, bottom = 14.dp, start = 4.dp, end = 16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White) }
                    Text("Settings", color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp)
                }
            }
            LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                item { SettingHeader("PRINTING") }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Receipts per order", fontWeight = FontWeight.Bold)
                            Text("How many copies to print each time", fontSize = 12.sp, color = Color.Gray)
                        }
                        Stepper(copies) { SettingsStore.setCopies(it) }
                    }
                }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Pause between tickets", fontWeight = FontWeight.Bold)
                            Text(if (gapSec == 0) "Off - tickets print back to back" else "Wait " + gapSec + "s before the next ticket prints", fontSize = 12.sp, color = Color.Gray)
                        }
                        Stepper(gapSec) { SettingsStore.setGapSec(it) }
                    }
                }
                item { SettingSwitch("Print logo / shop name", SettingsStore.printLogo, "printLogo") }
                item { SettingSwitch("Print shop address & phone", SettingsStore.printAddress, "printAddress") }
                item { SettingSwitch("Group items by category", SettingsStore.printCategories, "printCategories") }
                item { SettingSwitch("Small receipt (save paper)", SettingsStore.smallVersion, "smallVersion") }
                item { SettingSwitch("Print app version", SettingsStore.printVersion, "printVersion") }

                item { SettingHeader("ALERTS") }
                item { SettingSwitch("New-order sound", SettingsStore.soundEnabled, "soundEnabled") }

                item { SettingHeader("ORDER LIST") }
                item { SettingSwitch("Show today's orders only", SettingsStore.showTodayOnly, "showTodayOnly") }
                item { SettingSwitch("Hide confirmed orders", SettingsStore.hideConfirmed, "hideConfirmed") }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }

    @Composable
    fun SettingHeader(text: String) {
        Text(text, fontWeight = FontWeight.Black, fontSize = 12.sp, color = Color(0xFFFF5722), modifier = Modifier.padding(top = 18.dp, bottom = 4.dp))
    }

    @Composable
    fun SettingSwitch(label: String, state: androidx.compose.runtime.MutableState<Boolean>, key: String) {
        val checked by state
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
            Text(label, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
            Switch(checked = checked, onCheckedChange = { SettingsStore.toggle(key, state, it) })
        }
    }

    @Composable
    fun Stepper(value: Int, onChange: (Int) -> Unit) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(color = Color(0xFFE5E7EB), shape = RoundedCornerShape(8.dp), modifier = Modifier.clickable { onChange(value - 1) }) {
                Text("−", fontSize = 22.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp))
            }
            Text("$value", fontSize = 18.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 18.dp))
            Surface(color = Color(0xFFE5E7EB), shape = RoundedCornerShape(8.dp), modifier = Modifier.clickable { onChange(value + 1) }) {
                Text("+", fontSize = 22.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp))
            }
        }
    }

    private fun performLogin(email: String, pass: String, onResult: (Boolean, String) -> Unit) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val jsonBody = JSONObject().apply { put("email", email); put("password", pass) }
                val request = Request.Builder().url("$SERVER_URL/auth/login").post(jsonBody.toString().toRequestBody("application/json".toMediaType())).build()
                client.newCall(request).execute().use { response ->
                    val body = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val parsed = JSONObject(body)
                        val token = parsed.getString("token")
                        // Kept so the terminal can refresh its own session and stay
                        // signed in without anyone retyping a password mid-service.
                        val refreshTok = parsed.optString("refreshToken", "")

                        // REMEMBER ME
                        val prefs = getSharedPreferences("milano_pos", MODE_PRIVATE)
                        val ed = prefs.edit().putString("jwt_token", token)
                        if (refreshTok.isNotEmpty()) ed.putString("refresh_token", refreshTok)
                        ed.apply()

                        // Store creds securely so the always-on print service can
                        // silently re-authenticate when this token expires, instead
                        // of getting stuck on "Reconnecting…" until a manual re-login.
                        SecureCreds.save(this@MainActivity, email, pass)

                        // Register for order pushes now that we have a JWT.
                        DeviceRegistrar.register(this@MainActivity, token)

                        withContext(Dispatchers.Main) { jwtToken.value = token; onResult(true, "") }
                    } else {
                        // Distinguish bad credentials from a server/other error so
                        // staff aren't told "Invalid Credentials" on a 500.
                        val msg = if (response.code == 400 || response.code == 401) "Invalid Credentials"
                                  else "Login failed (${response.code}). Please try again."
                        withContext(Dispatchers.Main) { onResult(false, msg) }
                    }
                }
            } catch (e: Exception) { withContext(Dispatchers.Main) { onResult(false, "Connection Error") } }
        }
    }

    private fun startPrintService() {
        val intent = Intent(this, OrderPrintService::class.java).apply { action = OrderPrintService.ACTION_START }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(intent) else startService(intent)
        requestBatteryExemption()
    }

    private fun stopPrintService() {
        try {
            val intent = Intent(this, OrderPrintService::class.java).apply { action = OrderPrintService.ACTION_STOP }
            startService(intent)
        } catch (e: Exception) {}
        OrderStore.orders.clear()
    }

    private fun reprint(order: JSONObject) {
        val intent = Intent(this, OrderPrintService::class.java).apply {
            action = OrderPrintService.ACTION_REPRINT
            putExtra(OrderPrintService.EXTRA_ORDER_JSON, order.toString())
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(intent) else startService(intent)
    }

    private fun requestBatteryExemption() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            }
        } catch (e: Exception) {}
    }

    private fun updateStatus(id: String, status: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val json = JSONObject().apply { put("status", status) }
                val req = Request.Builder().url("$SERVER_URL/orders/$id/status").addHeader("Authorization", "Bearer ${jwtToken.value}").put(json.toString().toRequestBody("application/json".toMediaType())).build()
                // .use{} closes the response body — without it the OkHttp
                // connection leaks on every accept/ready tap.
                client.newCall(req).execute().use { }
            } catch (e: Exception) {}
        }
    }

}
