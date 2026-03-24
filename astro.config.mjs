import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
/** Astro 4: use sitemap 3.2.x — 3.3+ targets newer Astro (`astro:routes:resolved`). */
import sitemap from "@astrojs/sitemap";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function catalogLastmodDate() {
  try {
    const raw = readFileSync(
      path.join(__dirname, "src/data/catalog.json"),
      "utf8",
    );
    const { generated_at: generatedAt } = JSON.parse(raw);
    return new Date(generatedAt || Date.now());
  } catch {
    return new Date();
  }
}

function normalizeSitemapUrl(href) {
  try {
    const u = new URL(href);
    u.hash = "";
    const p = u.pathname.replace(/\/$/, "") || "";
    return `${u.origin}${p}`;
  } catch {
    return href;
  }
}

/**
 * Local dev: omit `ASTRO_BASE_PATH` → `base` is `/` (http://localhost:4321/).
 * GitHub Pages project site: set `ASTRO_BASE_PATH=/ai-tools-atlas` in CI (see workflow) so assets resolve.
 * Custom domain at repo root: keep `ASTRO_BASE_PATH` unset or `/`.
 * `PUBLIC_SITE_ORIGIN` overrides `site` when set (JSON-LD / robots use the same via site-meta).
 */
const site = (
  process.env.PUBLIC_SITE_ORIGIN || "https://github.com/khasky/ai-tools-atlas"
).replace(/\/$/, "");
const rawBase = (process.env.ASTRO_BASE_PATH || "").trim();
const base =
  !rawBase || rawBase === "/" ? "/" : `/${rawBase.replace(/^\/+|\/+$/g, "")}`;

const catalogLastmod = catalogLastmodDate();
const finalSiteUrl = new URL(base, site);

export default defineConfig({
  site,
  base,
  integrations: [
    tailwind(),
    sitemap({
      lastmod: catalogLastmod,
      changefreq: "weekly",
      priority: 0.7,
      serialize(item) {
        const home = normalizeSitemapUrl(finalSiteUrl.href);
        if (normalizeSitemapUrl(item.url) === home) {
          return { ...item, priority: 1.0 };
        }
        return item;
      },
    }),
  ],
  trailingSlash: "never",
  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
