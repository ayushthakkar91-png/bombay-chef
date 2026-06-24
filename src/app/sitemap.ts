import type { MetadataRoute } from "next";
import { BRANCHES } from "@/data/locations";
import { SITE_URL as SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const core = ["", "/menu", "/locations", "/reservations", "/order", "/contact"].map((p) => ({
    url: `${SITE}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.8,
  }));
  const branchPages = BRANCHES.flatMap((b) => [
    { url: `${SITE}/locations/${b.slug}`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE}/indian-restaurant-${b.slug}`, changeFrequency: "monthly" as const, priority: 0.7 },
  ]);
  return [...core, ...branchPages];
}
