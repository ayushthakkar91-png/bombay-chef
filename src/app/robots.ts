import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/platform", "/api"] },
    sitemap: "https://www.bombaybicyclechef.uk/sitemap.xml",
  };
}
