import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Bombay Bicycle Chef",
  description:
    "The terms that apply when you order, reserve a table, or buy a gift card with Bombay Bicycle Chef.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "24 June 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F6F2EA] px-6 pb-24 pt-[120px] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
      <article className="mx-auto max-w-[760px]">
        <p className="mb-4 font-sans text-[11px] uppercase tracking-[0.25em] text-[#806515]">Legal</p>
        <h1 className="font-serif text-[40px] font-light leading-[1.1] text-[#2B221D] md:text-[56px]">Terms of Service</h1>
        <p className="mt-4 font-sans text-[14px] text-[#5A524B]">Last updated: {UPDATED}</p>

        <div className="mt-10 flex flex-col gap-9 font-sans text-[15px] leading-[1.85] text-[#5A524B] [&_a]:text-[#806515] [&_a]:underline [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-[24px] [&_h2]:font-light [&_h2]:text-[#2B221D] [&_li]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-[#2B221D]">
          <p className="rounded-md border border-[#2A211C]/10 bg-white/50 p-4 text-[14px]">
            <strong>Note:</strong> these terms are a working template. Replace the bracketed placeholders with your
            registered details and have them reviewed by a solicitor before relying on them.
          </p>

          <section>
            <p>
              These terms apply when you use the <strong>Bombay Bicycle Chef</strong> website{" "}
              (&ldquo;we&rdquo;, &ldquo;us&rdquo;) to place an order, make a reservation, or buy and redeem a gift card. By
              using the site you agree to these terms.
            </p>
          </section>

          <section>
            <h2>Ordering</h2>
            <ul>
              <li>Menu items, prices and availability may change, and some dishes may sell out.</li>
              <li>An order is confirmed once payment is completed and you receive a confirmation; we may decline or refund an order if we cannot fulfil it.</li>
              <li>Collection and delivery times are estimates. Delivery is available only within the postcodes shown at checkout.</li>
              <li>Once preparation has begun an order generally cannot be cancelled — please contact the restaurant as soon as possible if there is a problem.</li>
            </ul>
          </section>

          <section>
            <h2>Reservations</h2>
            <ul>
              <li>A reservation is held for your selected date, time and party size, subject to availability.</li>
              <li>Please let us know in advance if you need to change or cancel. Repeated no-shows may affect future bookings.</li>
              <li>We may release a table after a reasonable grace period if the party has not arrived.</li>
            </ul>
          </section>

          <section>
            <h2>Gift cards</h2>
            <ul>
              <li>Gift cards can be redeemed against orders as shown at checkout and are valid until the expiry date stated on the card.</li>
              <li>Gift cards are not exchangeable for cash and cannot be replaced if lost where no valid code can be provided.</li>
              <li>Any unused balance remains on the card until it is spent or expires.</li>
            </ul>
          </section>

          <section>
            <h2>Payment</h2>
            <p>
              Payments are processed securely by Stripe. You confirm you are authorised to use the payment method provided.
              We do not store your full card details.
            </p>
          </section>

          <section>
            <h2>Allergies &amp; food information</h2>
            <p>
              Our dishes are prepared in kitchens that handle nuts, gluten, dairy and other allergens, and cross-contact may
              occur. If you have an allergy or dietary requirement, please tell us before ordering or dining so we can advise
              — do not rely on menu descriptions alone.
            </p>
          </section>

          <section>
            <h2>Accounts &amp; loyalty</h2>
            <p>
              If you create an account you are responsible for keeping your sign-in details secure. Loyalty points and rewards
              have no cash value and may be adjusted in case of error, abuse, or a cancelled/refunded order.
            </p>
          </section>

          <section>
            <h2>Liability</h2>
            <p>
              We provide the website and services with reasonable care and skill. To the extent permitted by law, we are not
              liable for indirect or unforeseeable loss. Nothing in these terms limits liability that cannot be limited by
              law, including for death or personal injury caused by negligence.
            </p>
          </section>

          <section>
            <h2>Governing law</h2>
            <p>These terms are governed by the laws of England and Wales, and the courts of England and Wales have jurisdiction.</p>
          </section>

          <section>
            <h2>Contact &amp; changes</h2>
            <p>
              Questions about these terms? Email{" "}
              <a href="mailto:hello@bombay-bicycle-chef.com">hello@bombay-bicycle-chef.com</a>. We may update these terms from
              time to time; the date at the top shows when they were last revised.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
