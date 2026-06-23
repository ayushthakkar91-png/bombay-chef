import "server-only";

/**
 * Transactional email templates for reservations. `renderTemplate` turns a
 * template id + payload (stored on the notifications outbox row) into a
 * subject/html/text triple, so the dispatcher is template-agnostic.
 */

export type ReservationEmailPayload = {
  guestName?: string;
  locationName?: string;
  dateLabel?: string;
  timeLabel?: string;
  partySize?: number;
  experienceLabel?: string;
  occasionLabel?: string;
  reference?: string;
  manageUrl?: string;
  reason?: string;
  /** admin alert summary line */
  adminSummary?: string;
  // Order fields (Phase 3)
  code?: string;
  fulfilment?: string;
  etaLabel?: string;
  totalLabel?: string;
  itemsSummary?: string;
  trackUrl?: string;
  statusLabel?: string;
  // Marketing fields (Phase 6)
  campaignSubject?: string;
  bodyText?: string;
  unsubscribeUrl?: string;
  ctaUrl?: string;
  // Gift card (Phase 8)
  fromName?: string;
};

export type TemplateId =
  | "reservation_confirmation"
  | "reservation_reminder"
  | "reservation_cancellation"
  | "reservation_modification"
  | "waitlist_joined"
  | "admin_new_reservation"
  | "order_confirmation"
  | "order_accepted"
  | "order_ready_collection"
  | "order_out_for_delivery"
  | "order_cancelled"
  | "admin_new_order"
  | "loyalty_birthday"
  | "marketing_welcome"
  | "abandoned_cart"
  | "marketing_campaign"
  | "gift_card_delivery";

const INK = "#2B221D";
const GOLD = "#B08A3E";
const PAPER = "#F6F2EA";
const MUTED = "#5A524B";

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:${PAPER};font-family:Georgia,'Times New Roman',serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid rgba(43,34,29,0.1);">
        <tr><td style="padding:28px 36px;border-bottom:1px solid rgba(43,34,29,0.08);">
          <div style="font-size:20px;letter-spacing:0.5px;">Bombay Bicycle Chef</div>
          <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-top:4px;">${title}</div>
        </td></tr>
        <tr><td style="padding:32px 36px;">${bodyHtml}</td></tr>
        <tr><td style="padding:20px 36px;border-top:1px solid rgba(43,34,29,0.08);font-family:Arial,sans-serif;font-size:11px;color:${MUTED};">
          Bombay Bicycle Chef · Balham · Battersea · Kilburn
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function detailRows(p: ReservationEmailPayload): string {
  const row = (k: string, v?: string | number) =>
    v == null || v === ""
      ? ""
      : `<tr><td style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${GOLD};padding:6px 0;width:120px;">${k}</td><td style="font-size:16px;padding:6px 0;">${v}</td></tr>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    ${row("Location", p.locationName)}
    ${row("Date", p.dateLabel)}
    ${row("Time", p.timeLabel)}
    ${row("Guests", p.partySize)}
    ${row("Experience", p.experienceLabel)}
    ${row("Occasion", p.occasionLabel)}
    ${row("Reference", p.reference)}
  </table>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:${INK};color:${PAPER};text-decoration:none;font-family:Arial,sans-serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;padding:14px 28px;margin-top:8px;">${label}</a>`;
}

function textLines(p: ReservationEmailPayload): string {
  return [
    p.locationName && `Location: ${p.locationName}`,
    p.dateLabel && `Date: ${p.dateLabel}`,
    p.timeLabel && `Time: ${p.timeLabel}`,
    p.partySize && `Guests: ${p.partySize}`,
    p.experienceLabel && `Experience: ${p.experienceLabel}`,
    p.occasionLabel && `Occasion: ${p.occasionLabel}`,
    p.reference && `Reference: ${p.reference}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function orderRows(p: ReservationEmailPayload): string {
  const row = (k: string, v?: string | number) =>
    v == null || v === ""
      ? ""
      : `<tr><td style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${GOLD};padding:6px 0;width:120px;">${k}</td><td style="font-size:16px;padding:6px 0;">${v}</td></tr>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    ${row("Order", p.code)}
    ${row("Location", p.locationName)}
    ${row(p.fulfilment === "delivery" ? "Delivery" : "Collection", p.fulfilment === "delivery" ? "To your door" : "From the restaurant")}
    ${row("Estimated", p.etaLabel)}
    ${row("Total", p.totalLabel)}
  </table>
  ${p.itemsSummary ? `<p style="font-family:Arial,sans-serif;font-size:13px;color:${MUTED};line-height:1.7;">${p.itemsSummary}</p>` : ""}`;
}

function orderText(p: ReservationEmailPayload): string {
  return [
    p.code && `Order: ${p.code}`,
    p.locationName && `Location: ${p.locationName}`,
    p.fulfilment && `Fulfilment: ${p.fulfilment}`,
    p.etaLabel && `Estimated: ${p.etaLabel}`,
    p.totalLabel && `Total: ${p.totalLabel}`,
    p.itemsSummary && `\n${p.itemsSummary}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderTemplate(
  template: TemplateId,
  p: ReservationEmailPayload,
): { subject: string; html: string; text: string } {
  const hi = p.guestName ? `Dear ${p.guestName},` : "Hello,";
  const manage = p.manageUrl ? button(p.manageUrl, "Manage booking") : "";
  const manageText = p.manageUrl ? `\nManage your booking: ${p.manageUrl}` : "";

  switch (template) {
    case "reservation_confirmation":
      return {
        subject: `Your table at Bombay Bicycle Chef${p.locationName ? ` — ${p.locationName}` : ""}`,
        html: shell(
          "Reservation confirmed",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Your table is confirmed. We can't wait to welcome you.</p>
           ${detailRows(p)}<p style="margin-top:8px;">${manage}</p>
           <p style="font-family:Arial,sans-serif;font-size:12px;color:${MUTED};line-height:1.7;margin-top:20px;">Need to change or cancel? Use the link above any time.</p>`,
        ),
        text: `${hi}\n\nYour table is confirmed.\n\n${textLines(p)}${manageText}\n\n— Bombay Bicycle Chef`,
      };

    case "reservation_reminder":
      return {
        subject: `Reminder: your table tomorrow${p.timeLabel ? ` at ${p.timeLabel}` : ""}`,
        html: shell(
          "A gentle reminder",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Looking forward to seeing you soon.</p>
           ${detailRows(p)}<p style="margin-top:8px;">${manage}</p>`,
        ),
        text: `${hi}\n\nA reminder of your upcoming booking.\n\n${textLines(p)}${manageText}\n\n— Bombay Bicycle Chef`,
      };

    case "reservation_modification":
      return {
        subject: `Your booking has been updated${p.locationName ? ` — ${p.locationName}` : ""}`,
        html: shell(
          "Booking updated",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Your reservation has been updated. The new details:</p>
           ${detailRows(p)}<p style="margin-top:8px;">${manage}</p>`,
        ),
        text: `${hi}\n\nYour reservation has been updated.\n\n${textLines(p)}${manageText}\n\n— Bombay Bicycle Chef`,
      };

    case "reservation_cancellation":
      return {
        subject: `Your booking has been cancelled`,
        html: shell(
          "Booking cancelled",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Your reservation has been cancelled.${p.reason ? ` (${p.reason})` : ""} We hope to welcome you another time.</p>
           ${detailRows(p)}`,
        ),
        text: `${hi}\n\nYour reservation has been cancelled.${p.reason ? ` (${p.reason})` : ""}\n\n${textLines(p)}\n\n— Bombay Bicycle Chef`,
      };

    case "waitlist_joined":
      return {
        subject: `You're on the waitlist${p.locationName ? ` — ${p.locationName}` : ""}`,
        html: shell(
          "On the waitlist",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">That time is fully booked, but you're on the waitlist. We'll email you the moment a table opens.</p>
           ${detailRows(p)}`,
        ),
        text: `${hi}\n\nYou're on the waitlist. We'll be in touch if a table opens.\n\n${textLines(p)}\n\n— Bombay Bicycle Chef`,
      };

    case "admin_new_reservation":
      return {
        subject: `New reservation${p.locationName ? ` — ${p.locationName}` : ""}: ${p.adminSummary ?? ""}`,
        html: shell(
          "New reservation",
          `<p style="font-size:16px;line-height:1.7;">A new booking has come in.</p>${detailRows(p)}
           <p style="font-family:Arial,sans-serif;font-size:12px;color:${MUTED};">${p.guestName ?? ""}</p>`,
        ),
        text: `New reservation.\n\n${textLines(p)}\n${p.guestName ?? ""}`,
      };

    case "order_confirmation": {
      const track = p.trackUrl ? button(p.trackUrl, "Track your order") : "";
      return {
        subject: `Order ${p.code ?? ""} confirmed — Bombay Bicycle Chef`,
        html: shell(
          "Order confirmed",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Thank you — your order is confirmed and we've started preparing it.</p>
           ${orderRows(p)}<p style="margin-top:8px;">${track}</p>`,
        ),
        text: `${hi}\n\nYour order is confirmed.\n\n${orderText(p)}${p.trackUrl ? `\n\nTrack: ${p.trackUrl}` : ""}\n\n— Bombay Bicycle Chef`,
      };
    }

    case "order_accepted":
      return {
        subject: `Order ${p.code ?? ""} accepted`,
        html: shell(
          "Order accepted",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Good news — the kitchen has accepted your order.${p.etaLabel ? ` Estimated ${p.fulfilment === "delivery" ? "delivery" : "collection"}: <strong>${p.etaLabel}</strong>.` : ""}</p>
           ${orderRows(p)}`,
        ),
        text: `${hi}\n\nYour order has been accepted.\n\n${orderText(p)}\n\n— Bombay Bicycle Chef`,
      };

    case "order_ready_collection":
      return {
        subject: `Order ${p.code ?? ""} is ready to collect`,
        html: shell(
          "Ready for collection",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Your order is ready and waiting${p.locationName ? ` at ${p.locationName}` : ""}. See you soon.</p>
           ${orderRows(p)}`,
        ),
        text: `${hi}\n\nYour order is ready to collect.\n\n${orderText(p)}\n\n— Bombay Bicycle Chef`,
      };

    case "order_out_for_delivery":
      return {
        subject: `Order ${p.code ?? ""} is on its way`,
        html: shell(
          "Out for delivery",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Your order is out for delivery${p.etaLabel ? ` and should arrive around <strong>${p.etaLabel}</strong>` : ""}.</p>
           ${orderRows(p)}`,
        ),
        text: `${hi}\n\nYour order is out for delivery.\n\n${orderText(p)}\n\n— Bombay Bicycle Chef`,
      };

    case "order_cancelled":
      return {
        subject: `Order ${p.code ?? ""} ${p.statusLabel === "Refunded" ? "refunded" : "cancelled"}`,
        html: shell(
          p.statusLabel === "Refunded" ? "Order refunded" : "Order cancelled",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Your order has been ${p.statusLabel === "Refunded" ? "refunded" : "cancelled"}.${p.reason ? ` (${p.reason})` : ""}${p.statusLabel === "Refunded" ? " Any payment will be returned to your card." : ""}</p>
           ${orderRows(p)}`,
        ),
        text: `${hi}\n\nYour order has been ${p.statusLabel === "Refunded" ? "refunded" : "cancelled"}.${p.reason ? ` (${p.reason})` : ""}\n\n${orderText(p)}\n\n— Bombay Bicycle Chef`,
      };

    case "admin_new_order":
      return {
        subject: `New ${p.fulfilment ?? ""} order ${p.code ?? ""}${p.locationName ? ` — ${p.locationName}` : ""}`,
        html: shell("New order", `<p style="font-size:16px;line-height:1.7;">A new paid order has come in.</p>${orderRows(p)}<p style="font-family:Arial,sans-serif;font-size:12px;color:${MUTED};">${p.guestName ?? ""}</p>`),
        text: `New paid order.\n\n${orderText(p)}\n${p.guestName ?? ""}`,
      };

    case "loyalty_birthday":
      return {
        subject: "Happy Birthday from Bombay Bicycle Chef",
        html: shell(
          "Happy Birthday",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Wishing you a very happy birthday. Here's a little gift from us — <strong>10% off</strong> your next order or table.</p>
           <p style="font-size:16px;line-height:1.7;">Use code <strong style="letter-spacing:1px;">${p.code ?? ""}</strong> at checkout. Valid for 30 days.</p>`,
        ),
        text: `${hi}\n\nHappy birthday! Enjoy 10% off your next order with code ${p.code ?? ""} (valid 30 days).\n\n— Bombay Bicycle Chef`,
      };

    case "marketing_welcome":
      return {
        subject: "Welcome to Bombay Bicycle Chef",
        html: shell(
          "Welcome",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Thank you for joining us. We'll share the occasional story from our kitchens, new dishes, and a few things worth coming in for — nothing more.</p>
           ${p.ctaUrl ? `<p style="margin-top:8px;">${button(p.ctaUrl, "Explore the menu")}</p>` : ""}
           ${unsub(p.unsubscribeUrl)}`,
        ),
        text: `${hi}\n\nThank you for joining us at Bombay Bicycle Chef.${p.unsubscribeUrl ? `\n\nUnsubscribe: ${p.unsubscribeUrl}` : ""}`,
      };

    case "abandoned_cart":
      return {
        subject: "You left something in your basket",
        html: shell(
          "Still hungry?",
          `<p style="font-size:16px;line-height:1.7;">${hi}</p>
           <p style="font-size:16px;line-height:1.7;">Your order${p.locationName ? ` from ${p.locationName}` : ""} is still waiting. Pick up where you left off.</p>
           ${p.itemsSummary ? `<p style="font-family:Arial,sans-serif;font-size:13px;color:${MUTED};">${p.itemsSummary}</p>` : ""}
           ${p.ctaUrl ? `<p style="margin-top:8px;">${button(p.ctaUrl, "Complete your order")}</p>` : ""}
           ${unsub(p.unsubscribeUrl)}`,
        ),
        text: `${hi}\n\nYour order is still waiting.${p.ctaUrl ? `\n\nComplete it: ${p.ctaUrl}` : ""}${p.unsubscribeUrl ? `\n\nUnsubscribe: ${p.unsubscribeUrl}` : ""}`,
      };

    case "gift_card_delivery":
      return {
        subject: `${p.fromName ? `${p.fromName} sent you` : "You've received"} a Bombay Bicycle Chef gift card`,
        html: shell(
          "A gift for you",
          `<p style="font-size:16px;line-height:1.7;">${p.guestName ? `Dear ${p.guestName},` : "Hello,"}</p>
           <p style="font-size:16px;line-height:1.7;">${p.fromName ? `${p.fromName} has` : "You've been"} sent you a gift card worth <strong>${p.totalLabel ?? ""}</strong> to spend at Bombay Bicycle Chef.</p>
           ${p.bodyText ? `<p style="font-size:16px;line-height:1.7;font-style:italic;color:${MUTED};">“${p.bodyText}”</p>` : ""}
           <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid ${GOLD};border-radius:8px;">
             <tr><td style="padding:18px 24px;text-align:center;">
               <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};">Gift card code</div>
               <div style="font-size:22px;letter-spacing:2px;margin-top:6px;">${p.code ?? ""}</div>
             </td></tr>
           </table>
           <p style="font-size:14px;line-height:1.7;color:${MUTED};">Redeem the code at checkout when ordering online. ${p.ctaUrl ? "" : ""}</p>
           ${p.ctaUrl ? `<p style="margin-top:8px;">${button(p.ctaUrl, "View & print your card")}</p>` : ""}`,
        ),
        text: `${p.guestName ? `Dear ${p.guestName},` : "Hello,"}\n\n${p.fromName ? `${p.fromName} has` : "You've been"} sent you a Bombay Bicycle Chef gift card worth ${p.totalLabel ?? ""}.\n${p.bodyText ? `\n"${p.bodyText}"\n` : ""}\nCode: ${p.code ?? ""}\n${p.ctaUrl ? `View/print: ${p.ctaUrl}\n` : ""}\nRedeem it at checkout when ordering online.`,
      };

    case "marketing_campaign": {
      const paras = (p.bodyText ?? "")
        .split(/\n{2,}/)
        .map((para) => `<p style="font-size:16px;line-height:1.7;">${para.replace(/\n/g, "<br/>")}</p>`)
        .join("");
      return {
        subject: p.campaignSubject ?? "Bombay Bicycle Chef",
        html: shell(p.campaignSubject ?? "Bombay Bicycle Chef", `${paras}${unsub(p.unsubscribeUrl)}`),
        text: `${p.bodyText ?? ""}${p.unsubscribeUrl ? `\n\nUnsubscribe: ${p.unsubscribeUrl}` : ""}`,
      };
    }
  }
}

/** Unsubscribe footer for marketing emails (PECR/GDPR). */
function unsub(url?: string): string {
  if (!url) return "";
  return `<p style="font-family:Arial,sans-serif;font-size:11px;color:${MUTED};margin-top:24px;border-top:1px solid rgba(43,34,29,0.08);padding-top:14px;">You're receiving this because you opted in to news from Bombay Bicycle Chef. <a href="${url}" style="color:${MUTED};">Unsubscribe</a>.</p>`;
}
