import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Bombay Bicycle Chef",
  description:
    "How Bombay Bicycle Chef collects, uses and protects your personal data across ordering, reservations, gift cards and marketing.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "24 June 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F6F2EA] px-6 pb-24 pt-[120px] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
      <article className="mx-auto max-w-[760px]">
        <p className="mb-4 font-sans text-[11px] uppercase tracking-[0.25em] text-[#806515]">Legal</p>
        <h1 className="font-serif text-[40px] font-light leading-[1.1] text-[#2B221D] md:text-[56px]">Privacy Policy</h1>
        <p className="mt-4 font-sans text-[14px] text-[#5A524B]">Last updated: {UPDATED}</p>

        <div className="mt-10 flex flex-col gap-9 font-sans text-[15px] leading-[1.85] text-[#5A524B] [&_a]:text-[#806515] [&_a]:underline [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-[24px] [&_h2]:font-light [&_h2]:text-[#2B221D] [&_li]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-[#2B221D]">
          <p className="rounded-md border border-[#2A211C]/10 bg-white/50 p-4 text-[14px]">
            <strong>Note:</strong> this policy is a working template. Replace the bracketed placeholders with your
            registered details and have it reviewed by a solicitor before relying on it.
          </p>

          <section>
            <p>
              This Privacy Policy explains how <strong>Bombay Bicycle Chef</strong> (&ldquo;we&rdquo;,
              &ldquo;us&rdquo;) collects and uses your personal data when you visit our website, place an
              order, make a reservation, buy or redeem a gift card, or join our mailing list. We are the data controller
              for that information.
            </p>
          </section>

          <section>
            <h2>Who we are</h2>
            <p>
              <strong>Data controller:</strong> Bombay Bicycle Chef.
              For any privacy question or request, contact us at{" "}
              <a href="mailto:info@bombaybicyclechef.com">info@bombaybicyclechef.com</a>.
            </p>
          </section>

          <section>
            <h2>What we collect</h2>
            <ul>
              <li><strong>Contact &amp; order details</strong> — name, email, phone, and (for delivery) your address.</li>
              <li><strong>Order &amp; reservation history</strong> — items, dates, party size, preferences and notes you provide.</li>
              <li><strong>Payment information</strong> — processed securely by Stripe. We never see or store your full card number.</li>
              <li><strong>Account &amp; loyalty data</strong> — if you create an account: your sign-in details, loyalty points and saved preferences.</li>
              <li><strong>Marketing preferences</strong> — whether you have opted in to email/SMS, and your consent record.</li>
              <li><strong>Technical data</strong> — basic device/usage information needed to run the site securely.</li>
            </ul>
          </section>

          <section>
            <h2>How we use it &amp; our lawful bases</h2>
            <ul>
              <li><strong>To fulfil your order or reservation</strong> and take payment — <em>performance of a contract</em>.</li>
              <li><strong>To run loyalty, gift cards and your account</strong> — <em>contract</em> and our <em>legitimate interests</em>.</li>
              <li><strong>To send marketing</strong> (offers, news) — only with your <em>consent</em>, which you can withdraw at any time.</li>
              <li><strong>To keep the service secure and meet legal/tax obligations</strong> — <em>legitimate interests</em> and <em>legal obligation</em>.</li>
            </ul>
          </section>

          <section>
            <h2>Who we share it with</h2>
            <p>We only share data with service providers who process it on our behalf, including:</p>
            <ul>
              <li><strong>Stripe</strong> — payment processing.</li>
              <li><strong>Brevo</strong> — transactional and marketing email.</li>
              <li><strong>Twilio / WhatsApp</strong> — SMS and messaging notifications (if enabled).</li>
              <li><strong>Supabase &amp; our hosting provider</strong> — secure data storage and delivery.</li>
            </ul>
            <p>We do not sell your personal data.</p>
          </section>

          <section>
            <h2>How long we keep it</h2>
            <p>
              We keep order and transaction records for as long as required for tax and accounting (typically six years),
              and other data only for as long as needed for the purpose it was collected. Marketing data is kept until you
              unsubscribe.
            </p>
          </section>

          <section>
            <h2>Your rights</h2>
            <p>Under UK GDPR you can ask us to access, correct, delete, restrict or port your data, and you can object to
              processing or withdraw consent. To exercise any of these, email{" "}
              <a href="mailto:privacy@bombay-bicycle-chef.com">privacy@bombay-bicycle-chef.com</a>. You can unsubscribe from
              marketing at any time via the link in our emails. If you&rsquo;re unhappy with how we handle your data you can
              complain to the Information Commissioner&rsquo;s Office (<a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>).
            </p>
          </section>

          <section>
            <h2>Cookies</h2>
            <p>
              We use only the cookies necessary to run the site and keep you signed in. If we introduce analytics or
              marketing cookies in future, we will ask for your consent first.
            </p>
          </section>

          <section>
            <h2>Security</h2>
            <p>
              We protect your data with encryption in transit, strict database access controls, and PCI-compliant payment
              handling through Stripe. No system is perfectly secure, but we work hard to keep your information safe.
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>We may update this policy from time to time. The date at the top shows when it was last revised.</p>
          </section>
        </div>
      </article>
    </div>
  );
}
