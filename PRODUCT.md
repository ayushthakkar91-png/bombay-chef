# Product

## Register

brand

## Users

Londoners and visitors choosing where to eat for an occasion that matters — a reunion, a date, a family gathering, a celebration. They arrive on a phone or laptop, often in the evening, often deciding between two or three places. They are not price-shopping; they are looking for somewhere that *feels* right. Their job to be done: in under a minute, decide "yes, this is the place," and book a table (or check the menu / locations on the way to that decision). The site's primary conversion is a reservation; the menu and locations are the supporting evidence that earns it.

## Product Purpose

Bombay Bicycle Chef is a modern Indian kitchen — inspired by the flavours, memories, and gathering places of old Bombay, reimagined for contemporary London dining. The site exists to make that story *felt* before a single dish is read: it is a cinematic, scroll-driven narrative ("chapters") that carries a visitor from arrival to the table. Success looks like a visitor who finishes the scroll wanting to be there — and reserves. It is a brand surface first (the design IS the product), with a serious reservations flow attached.

## Brand Personality

Warm · soulful · quietly refined. The voice is hospitable and narrative, not promotional — it tells stories ("Every City Has Its Stories. Ours Begin Around A Table.") and lets a bilingual Hindi prologue carry emotion the English can't. Above everything, a guest should leave with a feeling of **warm belonging**: the nostalgia and generosity of a shared table. Elegant but never cold; premium but never aloof. Heritage is present, but the register is *modern* Bombay, not museum-piece India.

## Anti-references

- **Generic "ethnic" restaurant clichés.** No marigold/saffron color-spam, no paisley clip-art, no Rajasthan-tourism stock imagery. The Indian-ness comes from typography, copy, language, and food photography — never from costume decoration.
- **Templated SaaS / landing-page slop.** No tiny uppercase tracked eyebrow above every section, no identical icon-heading-text card grids, no gradient text, no hero-metric blocks. (One named kicker like "Chapter I · The Arrival" is deliberate brand voice; an eyebrow on every section is not.)
- **Loud, over-animated.** No motion for its own sake, no bounce/elastic easing, no effects that fight the food or the reading. Motion is cinematic and restrained — it should feel expensive, not busy.
- **Cheap / discount energy.** Nothing fast-casual, deal-driven, or budget. No "order now" urgency, no promo banners. The premium register must hold everywhere.

## Design Principles

1. **Feeling before information.** The emotional read (warmth, belonging, a story) lands before the menu or the facts. Atmosphere is the argument; the reservation is its conclusion.
2. **The photograph is the design.** This is an image-led, food-and-place brand. Real, mood-committed imagery carries the visual weight; colored panels where a hero photo belongs are a bug, not restraint.
3. **Restraint reads as expensive.** One dominant idea per fold, deliberate pacing, exponential ease-out motion. The luxury is in what's left out and how slowly it breathes.
4. **The story is bilingual and specific.** Hindi prologues, named chapters, and old-Bombay specifics are the brand's voice. Reach for the particular memory, not the generic category.
5. **Beauty must survive the real world.** Cinematic motion is the signature, but the content underneath — especially the reservation CTA — must be legible and present without JavaScript, under reduced motion, on a slow phone, and for a crawler. The atmosphere enhances an already-working page; it never gates it.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**: body text ≥4.5:1 and large text ≥3:1 against its actual background (including over photography — use scrims/text-shadow where the image can't guarantee it). Every animation must honor `prefers-reduced-motion: reduce` with an instant or crossfade fallback that still shows final content. Critical content and the primary reservation CTA must never depend on JS-driven reveals to become visible. Devanagari passages carry `lang="hi"` for correct screen-reader pronunciation; imagery carries voice-bearing alt text. Motion is a defining feature of the brand, but it is always additive over an accessible, visible default.
