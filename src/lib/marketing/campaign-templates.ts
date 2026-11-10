/**
 * Ready-made campaign copy.
 *
 * Campaigns already render through the branded email shell in
 * `src/lib/email/templates.ts`, so what these provide is the writing: a subject
 * and a body the office can drop in and edit, rather than facing a blank box.
 *
 * House voice, from PRODUCT.md: warm, narrative, specific. These are letters
 * from a restaurant, not promotions — no urgency, no discount shouting, no
 * "BOOK NOW". Square brackets mark the bits to change before sending.
 */

export type CampaignTemplate = {
  id: string;
  /** Shown on the button. */
  name: string;
  /** When this one is the right thing to send. */
  when: string;
  subject: string;
  body: string;
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "new-dishes",
    name: "New dishes",
    when: "Something new on the menu",
    subject: "Three new dishes, and the story behind them",
    body: [
      "Dear friend,",
      "Our kitchen has been quietly working on something, and it is ready for your table.",
      "[Dish name] — [one line on what is in it, and what it tastes like].\n[Dish name] — [one line].\n[Dish name] — [one line].",
      "[A sentence on where the idea came from: a street in Bombay, a grandmother's kitchen, a memory worth repeating.]",
      "They are on the menu from [date]. We would love you to be among the first.",
      "Warmly,\nThe team at Bombay Bicycle Chef",
    ].join("\n\n"),
  },
  {
    id: "we-miss-you",
    name: "We miss you",
    when: "Guests who have not visited in a while",
    subject: "Your table is still here",
    body: [
      "Dear friend,",
      "It has been a little while since we last cooked for you, and we noticed.",
      "Nothing dramatic has changed. The same cooks, the same slow-simmered gravies, the same table by the window. [Add one small, true thing that has changed — a new dish, a new room, longer weekend hours.]",
      "If you have been meaning to come back, this is us saying we would be glad to see you.",
      "Warmly,\nThe team at Bombay Bicycle Chef",
    ].join("\n\n"),
  },
  {
    id: "weekend-table",
    name: "Weekend table",
    when: "Filling a quiet week ahead",
    subject: "A table this weekend?",
    body: [
      "Dear friend,",
      "We still have a few tables free this [Friday / Saturday / Sunday], and it felt a shame not to mention it.",
      "[One specific, appetising detail: what the kitchen is cooking this weekend, what is good right now, who is playing if there is music.]",
      "If the evening is still open, we would love to feed you.",
      "Warmly,\nThe team at Bombay Bicycle Chef",
    ].join("\n\n"),
  },
  {
    id: "festive",
    name: "Festive season",
    when: "Diwali, Christmas, New Year",
    subject: "[Diwali] at Bombay Bicycle Chef",
    body: [
      "Dear friend,",
      "[Festival] is almost here, and our kitchen is already busy with it.",
      "We are cooking [one or two dishes made only for this] from [start date] to [end date]. [A line on why this dish belongs to this festival — the memory, the ritual, the family it came from.]",
      "Tables for larger groups go quickly at this time of year, so do let us know early if you are bringing everyone.",
      "[Opening hours over the festival, if they differ.]",
      "Warmly,\nThe team at Bombay Bicycle Chef",
    ].join("\n\n"),
  },
  {
    id: "thank-you",
    name: "Thank you",
    when: "After someone's first visit or first order",
    subject: "Thank you for eating with us",
    body: [
      "Dear friend,",
      "Thank you for choosing us. We know there is no shortage of places to eat in [Balham], and we do not take it lightly that you picked ours.",
      "If anything fell short, we would genuinely rather hear it from you than not at all — just reply to this email and it reaches us.",
      "And if it was good, telling someone else is the kindest thing you can do for a small kitchen.",
      "Warmly,\nThe team at Bombay Bicycle Chef",
    ].join("\n\n"),
  },
  {
    id: "private-dining",
    name: "Private dining",
    when: "Promoting group bookings and events",
    subject: "For the gatherings that matter",
    body: [
      "Dear friend,",
      "Birthdays, anniversaries, the dinner where everyone finally gets together — we keep a room for exactly those.",
      "[How many it seats], [what the set menu looks like], [anything else worth knowing: a private bar, a projector, a long table that fits everyone].",
      "If you have something coming up, reply to this email and we will help you plan it.",
      "Warmly,\nThe team at Bombay Bicycle Chef",
    ].join("\n\n"),
  },
];
