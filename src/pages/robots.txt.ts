import type { APIRoute } from "astro";
import { siteOrigin } from "../lib/site-meta";
import { withBase } from "../lib/paths";

export const GET: APIRoute = () => {
  const origin = siteOrigin();
  const lines = ["User-agent: *", "Allow: /", ""];

  if (origin) {
    const sitemapPath = withBase("/sitemap-index.xml");
    lines.push(`Sitemap: ${origin}${sitemapPath}`, "");
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
