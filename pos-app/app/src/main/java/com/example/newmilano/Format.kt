package com.example.newmilano

import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Small shared formatting helpers used by both the on-screen order list
 * (MainActivity) and the printed receipt (OrderPrintService), so money and
 * date/time look identical in both places.
 */

/** Always 2 decimals — kills floating-point tails like 24.0999999 -> "24.10". */
fun money(v: Double): String = String.format(Locale.UK, "%.2f", v)

private val london: TimeZone = TimeZone.getTimeZone("Europe/London")
private val utc: TimeZone = TimeZone.getTimeZone("UTC")

/**
 * SimpleDateFormat is expensive to construct and not thread-safe, and these are
 * called for every order card on every redraw — which, with a dozen orders on
 * screen, is thousands of throwaway objects a minute. Cache one per pattern per
 * thread instead.
 */
private val formatters = ThreadLocal.withInitial { HashMap<String, SimpleDateFormat>() }

private fun formatterFor(pattern: String, zone: TimeZone): SimpleDateFormat {
    val f = formatters.get()!!.getOrPut(pattern) { SimpleDateFormat(pattern, Locale.UK) }
    f.timeZone = zone
    return f
}
private val isoPatterns = listOf(
    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    "yyyy-MM-dd'T'HH:mm:ss'Z'",
    "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
    "yyyy-MM-dd'T'HH:mm:ssXXX"
)

/**
 * Postgres/Supabase timestamps carry microseconds and a numeric offset
 * ("2026-11-09T20:01:12.781181+00:00"), while the patterns below expect at
 * most milliseconds. SimpleDateFormat is lenient and would read .781181 as
 * 781,181 MILLISECONDS — putting every order 13 minutes into the future — so
 * trim the fraction to three digits before parsing.
 */
private val longFraction = Regex("""(\.\d{3})\d+""")

private fun parseIso(iso: String?): Date? {
    if (iso.isNullOrEmpty()) return null
    val normalised = longFraction.replace(iso) { it.groupValues[1] }
    for (p in isoPatterns) {
        try {
            val f = formatterFor(p, if (p.endsWith("'Z'")) utc else london)
            f.isLenient = false
            return f.parse(normalised)
        } catch (e: Exception) { /* try next pattern */ }
    }
    return null
}

/** Epoch millis for an ISO timestamp, or null if unparseable. */
fun parseIsoMillis(iso: String?): Long? = parseIso(iso)?.time

/** "HH:mm" in London time, or "" if the timestamp can't be parsed. */
fun formatTime(iso: String?): String {
    val d = parseIso(iso) ?: return ""
    val f = formatterFor("HH:mm", london)
    return f.format(d)
}

/** "dd/MM/yyyy" in London time, or "" if unparseable. */
fun formatDate(iso: String?): String {
    val d = parseIso(iso) ?: return ""
    val f = formatterFor("dd/MM/yyyy", london)
    return f.format(d)
}

/** True if the timestamp is on today's London date. */
fun isToday(iso: String?): Boolean {
    val d = parseIso(iso) ?: return false
    val f = formatterFor("yyyy-MM-dd", london)
    return f.format(d) == f.format(Date())
}

fun isDelivery(type: String?): Boolean = type.equals("delivery", ignoreCase = true)

/** Backend stores "delivery" / "pickup"; kitchen wants DELIVERY / COLLECTION. */
fun orderTypeLabel(type: String?): String = if (isDelivery(type)) "DELIVERY" else "COLLECTION"

/** One-line delivery address ("street, city, postcode") or "" if none. */
fun addressLine(order: JSONObject): String {
    val a = order.optJSONObject("deliveryAddress") ?: return ""
    return listOf(
        a.optString("street", ""),
        a.optString("city", ""),
        a.optString("postalCode", "")
    ).filter { it.isNotBlank() }.joinToString(", ")
}

/** Driver notes attached to the delivery address, or "". */
fun addressNotes(order: JSONObject): String =
    order.optJSONObject("deliveryAddress")?.optString("notes", "") ?: ""
