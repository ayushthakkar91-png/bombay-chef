import "server-only";

/**
 * Optional LLM narration. The engine computes every figure; the model only turns
 * the supplied numbers into prose (it's instructed never to invent figures). With
 * no ANTHROPIC_API_KEY set, a deterministic templated brief is used instead — so
 * the feature degrades gracefully and never fabricates data.
 */
export type BriefContext = {
  scope: string;
  period: string;
  revenue: { current: string; pct: number | null; direction: string };
  insights: string[];
  alerts: string[];
  recommendations: string[];
};

export async function generateExecutiveBrief(ctx: BriefContext): Promise<{ text: string; source: "ai" | "fallback" }> {
  const key = process.env.ANTHROPIC_API_KEY;
  // AI narration is opt-in: stays off (deterministic brief) unless INSIGHTS_AI=on.
  if (process.env.INSIGHTS_AI !== "on" || !key) return { text: fallbackBrief(ctx), source: "fallback" };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.INSIGHTS_MODEL || "claude-sonnet-4-6",
        max_tokens: 400,
        system:
          "You are a restaurant business analyst writing for an owner. Using ONLY the figures provided in the JSON, write a tight 3–4 sentence executive brief: how the business is trending, the single most important thing to act on, and a forward note. Never invent numbers or facts beyond the JSON. Plain, confident, British English.",
        messages: [{ role: "user", content: JSON.stringify(ctx) }],
      }),
    });
    if (!res.ok) return { text: fallbackBrief(ctx), source: "fallback" };
    const json = (await res.json()) as { content?: { text?: string }[] };
    const text = json.content?.[0]?.text?.trim();
    return text ? { text, source: "ai" } : { text: fallbackBrief(ctx), source: "fallback" };
  } catch {
    return { text: fallbackBrief(ctx), source: "fallback" };
  }
}

function fallbackBrief(ctx: BriefContext): string {
  const trend = ctx.revenue.direction === "up" ? "trending up" : ctx.revenue.direction === "down" ? "softening" : "holding steady";
  const pct = ctx.revenue.pct != null ? ` (${ctx.revenue.pct > 0 ? "+" : ""}${ctx.revenue.pct}%)` : "";
  const parts = [`Over the ${ctx.period}, ${ctx.scope} revenue is ${trend}${pct} at ${ctx.revenue.current}.`];
  if (ctx.insights[0]) parts.push(ctx.insights[0]);
  if (ctx.alerts[0]) parts.push(`Watch: ${ctx.alerts[0].toLowerCase()}.`);
  if (ctx.recommendations[0]) parts.push(`Next move: ${ctx.recommendations[0].toLowerCase()}.`);
  return parts.join(" ");
}
