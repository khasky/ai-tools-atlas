/**
 * Reads data/sources/*.json (tool-bearing sources), dedupes by canonical URL, emits catalog.json.
 * No synthetic tools: every row must trace to a fetched source file.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildCategories,
  PRIMARY_CATEGORIES,
} from "./lib/catalog-taxonomy.mjs";
import {
  resolveListingName,
  isJunkLinkLabel,
  titleFromWebsiteUrl,
} from "./lib/listing-text.mjs";
import { isDisallowedListingUrl } from "./lib/listing-url-policy.mjs";
import {
  isNonEnglishCatalogBlurb,
  isMostlyNonLatinToolName,
  pickEnglishPreferredDescription,
} from "./lib/listing-en-locale.mjs";
import { sanitizeCatalogTitle } from "./lib/listing-title-sanitize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

const ROOT = path.join(__dirname, "..");
const SOURCES_DIR = path.join(ROOT, "data", "sources");
const OUT = path.join(ROOT, "src", "data", "catalog.json");
const PUBLIC_OUT = path.join(ROOT, "public", "data", "catalog.json");

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

function urlKey(raw) {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.search = "";
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    let p = u.pathname.replace(/\/$/, "") || "";
    const parts = p.split("/").map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    });
    p = parts.join("/").toLowerCase();
    return `${host}${p}`;
  } catch {
    return null;
  }
}

function stableId(key) {
  return `tool-${createHash("sha256").update(key).digest("hex").slice(0, 16)}`;
}

function inferFacet(text) {
  const t = (text || "").toLowerCase();
  if (/\b(code|copilot|ide|github|vscode|developer|api sdk)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "ai-code");
  if (/\b(image|diffusion|stable diffusion|dall|midjourney|photo)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "image-gen");
  if (/\b(video|ffmpeg|clip)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "video-ai");
  if (/\b(audio|speech|voice|transcrib|whisper|tts)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "meetings");
  if (/\b(agent|automation|workflow|zapier)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "agents");
  if (/\b(search|rag|retriev|perplex)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "search");
  if (/\b(write|copy|content|blog|essay)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "ai-writing");
  if (/\b(data|sql|analytics|spreadsheet|bi)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "data-ai");
  if (/\b(slide|presentation|deck|pitch)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "presentation-ai");
  if (/\b(seo|keyword)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "seo-ai");
  if (/\b(support|helpdesk|ticket)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "customer-support-ai");
  if (/\b(sales|crm|outreach)\b/.test(t))
    return PRIMARY_CATEGORIES.find((c) => c.slug === "sales-ai");
  return PRIMARY_CATEGORIES.find((c) => c.slug === "agents");
}

/** Product/service listings only: drop Hub Spaces, model repos, and datasets. */
function isToolServiceWebsiteUrl(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const path = u.pathname.toLowerCase();
    if (host !== "huggingface.co") return true;
    if (
      path.startsWith("/spaces/") ||
      path.startsWith("/models/") ||
      path.startsWith("/datasets/")
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function loadSourceFiles() {
  if (!existsSync(SOURCES_DIR)) {
    throw new Error(`Missing ${SOURCES_DIR}. Run: node scripts/fetch-all.mjs`);
  }
  const files = readdirSync(SOURCES_DIR).filter(
    (f) =>
      f.endsWith(".json") &&
      f !== "prd_directory_landings.json" &&
      f !== "awesome_ai_awesomeness.json",
  );
  if (!files.length) {
    throw new Error(
      `No source JSON files in ${SOURCES_DIR}. Run: node scripts/fetch-all.mjs`,
    );
  }
  return files.map((f) => path.join(SOURCES_DIR, f));
}

function collectRawEntries() {
  const entries = [];
  for (const file of loadSourceFiles()) {
    const data = readJson(file);
    const base = path.basename(file);

    if (Array.isArray(data.items) && data.source_id) {
      for (const row of data.items) {
        if (!row.website_url) continue;
        if (isDisallowedListingUrl(row.website_url)) continue;
        if (!isToolServiceWebsiteUrl(row.website_url)) continue;
        const key = urlKey(row.website_url);
        if (!key) continue;
        let desc = (row.description || "").trim();
        if (isNonEnglishCatalogBlurb(desc)) desc = "";

        const hostHint = (() => {
          try {
            return new URL(row.website_url).hostname.replace(/^www\./i, "");
          } catch {
            return "";
          }
        })();
        const listLabel = data.list_name || data.source_id;
        const shortFallback = hostHint
          ? `${hostHint} — listed in “${listLabel}” (no English blurb in source data).`
          : `Listed in “${listLabel}”.`;
        const longFallback =
          desc ||
          (hostHint
            ? `No English description in source listings for this URL. See the vendor site for details: ${row.website_url} (${hostHint}). Indexed in “${listLabel}”${data.source_homepage ? ` — ${data.source_homepage}` : ""}.`
            : `Listed in curated list “${listLabel}” (${data.source_homepage || ""}).`);
        let name = resolveListingName(row.name?.trim() || "", row.website_url);
        if (isMostlyNonLatinToolName(name)) {
          const fromUrl = titleFromWebsiteUrl(row.website_url);
          if (fromUrl) name = fromUrl.slice(0, 200);
        }
        entries.push({
          key,
          website_url: row.website_url,
          name,
          description: desc ? desc.slice(0, 280) : shortFallback.slice(0, 280),
          long_description: longFallback.slice(0, 4000),
          source_labels: [data.source_id],
          facetHint: `${name} ${desc}`,
          from_file: base,
        });
      }
    }
  }
  return entries;
}

/**
 * Sets free_plan_available / enterprise_ready from observable signals only (no invented vendor claims).
 */
function enrichPricingAndEnterprise(tool, row) {
  const listingText = `${row.description || ""}\n${row.long_description || ""}\n${row.facetHint || ""}`;
  const lower = listingText.toLowerCase();

  if (tool.open_source) {
    tool.free_plan_available = true;
    tool.evidence_summary.push({
      label: "Free-to-try signal",
      value:
        "Listing URL points at a source repository; software is commonly usable without a separate product fee (verify license and any hosted offerings).",
    });
  } else if (
    /\bfree\b/.test(lower) ||
    /\bfreemium\b/.test(lower) ||
    /\bfree[-\s]?tier\b/.test(lower) ||
    /\bfree[-\s]?plan\b/.test(lower)
  ) {
    tool.free_plan_available = true;
    tool.evidence_summary.push({
      label: "Free-to-try signal",
      value:
        "Listing text mentions free / freemium / free tier or plan; confirm current pricing on the vendor site.",
    });
  }

  const complianceHits = [];
  if (/\benterprise\b/.test(lower)) complianceHits.push("enterprise");
  if (/soc\s*2|soc2/.test(lower)) complianceHits.push("SOC 2");
  if (/\bhipaa\b/.test(lower)) complianceHits.push("HIPAA");
  if (/\bgdpr\b/.test(lower)) complianceHits.push("GDPR");
  if (/\biso\s*27001\b/.test(lower)) complianceHits.push("ISO 27001");
  if (/\bsso\b/.test(lower)) complianceHits.push("SSO");
  if (/\bscim\b/.test(lower)) complianceHits.push("SCIM");

  if (complianceHits.length > 0) {
    tool.enterprise_ready = true;
    tool.evidence_summary.push({
      label: "Enterprise-oriented keywords in listing",
      value: `${[...new Set(complianceHits)].join(", ")} (not independently verified).`,
    });
    tool.security_compliance = [
      ...new Set(
        complianceHits.map((h) =>
          h === "enterprise" ? "Enterprise (listing text)" : h,
        ),
      ),
    ];
  }
}

function pickMergedName(a, b) {
  const ta = (a || "").trim();
  const tb = (b || "").trim();
  if (!tb) return ta;
  if (!ta) return tb;
  if (isJunkLinkLabel(ta) && !isJunkLinkLabel(tb)) return tb.slice(0, 200);
  if (isJunkLinkLabel(tb) && !isJunkLinkLabel(ta)) return ta.slice(0, 200);
  return (tb.length > ta.length ? tb : ta).slice(0, 200);
}

function mergeEntries(entries) {
  const map = new Map();
  for (const e of entries) {
    const cur = map.get(e.key);
    if (!cur) {
      map.set(e.key, { ...e });
      continue;
    }
    cur.source_labels = [
      ...new Set([...cur.source_labels, ...e.source_labels]),
    ];
    cur.name = pickMergedName(cur.name, e.name);
    if (isMostlyNonLatinToolName(cur.name)) {
      const fromUrl = titleFromWebsiteUrl(cur.website_url);
      if (fromUrl) cur.name = fromUrl.slice(0, 200);
    }
    cur.description = pickEnglishPreferredDescription(
      cur.description,
      e.description,
    );
    cur.long_description = pickEnglishPreferredDescription(
      cur.long_description,
      e.long_description,
    );
    cur.facetHint = `${cur.facetHint} ${e.facetHint}`;
  }
  return [...map.values()];
}

/** Same key as visible catalog title after sanitization (case-insensitive). */
function normalizedDisplayNameKey(name) {
  return sanitizeCatalogTitle(name, 200)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function urlPreferenceScore(entry) {
  try {
    const u = new URL(entry.website_url);
    let s = 0;
    if (u.protocol === "https:") s += 1000;
    s -= Math.min(u.pathname.length + u.search.length, 800);
    if (!u.search || u.search === "?") s += 30;
    return s;
  } catch {
    return -1e9;
  }
}

/** When merging same display name, keep the row with the cleaner / more canonical URL. */
function preferListingRowForMerge(a, b) {
  const sa = urlPreferenceScore(a);
  const sb = urlPreferenceScore(b);
  if (sa !== sb) return sa > sb ? a : b;
  const la = a.description?.length || 0;
  const lb = b.description?.length || 0;
  if (la !== lb) return la > lb ? a : b;
  return a.key.localeCompare(b.key) <= 0 ? a : b;
}

function mergeDisplayNameDuplicates(a, b) {
  const prefer = preferListingRowForMerge(a, b);
  const other = prefer === a ? b : a;
  const out = { ...prefer };
  out.source_labels = [
    ...new Set([...prefer.source_labels, ...other.source_labels]),
  ];
  out.name = pickMergedName(prefer.name, other.name);
  if (isMostlyNonLatinToolName(out.name)) {
    const fromUrl = titleFromWebsiteUrl(prefer.website_url);
    if (fromUrl) out.name = fromUrl.slice(0, 200);
  }
  out.description = pickEnglishPreferredDescription(
    prefer.description,
    other.description,
  );
  out.long_description = pickEnglishPreferredDescription(
    prefer.long_description,
    other.long_description,
  );
  out.facetHint = `${prefer.facetHint} ${other.facetHint}`.slice(0, 12000);
  out.from_file = [prefer.from_file, other.from_file].filter(Boolean).join(";");
  out.key = urlKey(out.website_url);
  return out;
}

/**
 * Collapse rows that share the same sanitized display name but different URLs (tracking params, mirrors).
 */
function dedupeByDisplayName(entries) {
  const byName = new Map();
  const passthrough = [];
  for (const e of entries) {
    const nk = normalizedDisplayNameKey(e.name);
    if (nk.length < 4 || nk === "untitled") {
      passthrough.push(e);
      continue;
    }
    const ex = byName.get(nk);
    if (!ex) {
      byName.set(nk, { ...e });
      continue;
    }
    byName.set(nk, mergeDisplayNameDuplicates(ex, e));
  }
  return [...byName.values(), ...passthrough];
}

function buildTool(row) {
  const cat = inferFacet(row.facetHint) || PRIMARY_CATEGORIES[0];
  const displayName = sanitizeCatalogTitle(row.name, 200);
  const slugBase =
    slugify(row.key.replace(/[^a-z0-9]+/gi, "-")) ||
    slugify(displayName) ||
    slugify(row.name);
  const slug = `${slugBase}-${stableId(row.key).slice(-6)}`;

  const host = (() => {
    try {
      return new URL(row.website_url).hostname.replace(/^www\./i, "");
    } catch {
      return "unknown";
    }
  })();

  const open_source = /github\.com/i.test(row.website_url);

  const evidence = [
    { label: "Canonical URL", value: row.website_url },
    { label: "Sources", value: row.source_labels.join(", ") },
  ];

  const now = new Date().toISOString();

  const tool = {
    id: stableId(row.key),
    slug,
    canonical_name: displayName,
    aliases: [],
    short_description: row.description.slice(0, 500),
    long_description: row.long_description.slice(0, 4000),
    website_url: row.website_url,
    company: {
      name: sanitizeCatalogTitle(row.name, 120),
      domain: host,
    },
    primary_category_slug: cat.slug,
    secondary_category_slugs: [],
    use_case_slugs: [cat.job],
    modality_slugs: [cat.modality],
    domain_slugs: [cat.domain],
    capability_tags: [],
    pricing_model: "UNKNOWN",
    deployment: [],
    platforms: ["web"],
    integrations: [],
    screenshots: [],
    best_for:
      "Use this entry as a starting point; confirm the product still matches your workflow and policies.",
    watchouts:
      "Listing-only snapshot: pricing, security, compliance, and roadmap were not independently verified for this build.",
    alternative_slugs: [],
    last_verified_at: now,
    first_seen_at: now,
    published_at: now,
    signal_rank_overall: null,
    signal_rank_category_percentile: null,
    adoption_score: null,
    reputation_score: null,
    maintenance_score: null,
    trust_transparency_score: null,
    momentum_score: null,
    ecosystem_authority_score: null,
    confidence_grade: "E",
    ranking_explanation_tokens: [
      "listing_verified_public_source",
      "confidence_moderate_sparse_evidence",
    ],
    sponsored: false,
    evidence_summary: evidence,
    activity_timeline: [
      {
        date: now,
        label: "Ingested from public directory sources (aggregated JSON).",
      },
    ],
    external_links: [
      { type: "website", url: row.website_url, label: "Listed URL" },
    ],
    open_source,
    enterprise_ready: false,
    free_plan_available: false,
    api_docs_available: false,
    security_compliance: [],
    status: "published",
  };

  enrichPricingAndEnterprise(tool, row);
  return tool;
}

function wireAlternatives(tools) {
  const byFacet = new Map();
  for (const t of tools) {
    if (!byFacet.has(t.primary_category_slug))
      byFacet.set(t.primary_category_slug, []);
    byFacet.get(t.primary_category_slug).push(t);
  }
  for (const t of tools) {
    const pool = byFacet.get(t.primary_category_slug) || [];
    const alts = pool.filter((x) => x.slug !== t.slug).slice(0, 3);
    t.alternative_slugs = alts.map((x) => x.slug);
    if (t.alternative_slugs.length < 3) {
      const extra = tools.filter(
        (x) => x.slug !== t.slug && !t.alternative_slugs.includes(x.slug),
      );
      t.alternative_slugs = [
        ...t.alternative_slugs,
        ...extra.slice(0, 3 - t.alternative_slugs.length).map((x) => x.slug),
      ];
    }
  }
}

function buildEditorial(tools) {
  const byName = [...tools].sort((a, b) =>
    a.canonical_name.localeCompare(b.canonical_name),
  );
  return [
    {
      slug: "best-ai-code-assistants-2026",
      title: "Best AI code assistants in 2026",
      summary: "Curated from aggregated listings; verify fit on vendor sites.",
      tool_slugs: tools
        .filter((t) => t.primary_category_slug === "ai-code")
        .slice(0, 12)
        .map((t) => t.slug),
    },
    {
      slug: "best-free-ai-writing-tools",
      title: "Best free AI writing tools",
      summary: "Listing snapshot; verify pricing on vendor sites.",
      tool_slugs: tools
        .filter((t) => t.primary_category_slug === "ai-writing")
        .slice(0, 12)
        .map((t) => t.slug),
    },
    {
      slug: "best-image-generators-for-marketing",
      title: "Best image generators for marketing",
      summary:
        "Curated from aggregated product listings in the image-gen facet; verify vendors directly.",
      tool_slugs: byName
        .filter((t) => t.primary_category_slug === "image-gen")
        .slice(0, 12)
        .map((t) => t.slug),
    },
  ];
}

export function aggregateCatalog() {
  const rawEntries = collectRawEntries();
  const merged = mergeEntries(rawEntries);
  console.log(
    `URL dedupe: ${rawEntries.length} listing rows -> ${merged.length} unique canonical URLs (host+path).`,
  );
  const mergedNames = dedupeByDisplayName(merged);
  if (mergedNames.length !== merged.length) {
    console.log(
      `Display-name dedupe: ${merged.length} -> ${mergedNames.length} tools (same title, different URLs merged).`,
    );
  }
  mergedNames.sort((a, b) => a.key.localeCompare(b.key));
  const tools = mergedNames.map((row) => buildTool(row));
  wireAlternatives(tools);

  const catalog = {
    generated_at: new Date().toISOString(),
    version: 2,
    aggregation_note:
      "Merged from public GitHub repositories. Descriptions stay English; non-Latin cells get English fallbacks. Same display name under different URLs collapses to one row. No invented vendors.",
    categories: buildCategories(),
    tools,
    editorial_pages: buildEditorial(tools),
  };

  mkdirSync(path.dirname(OUT), { recursive: true });
  mkdirSync(path.dirname(PUBLIC_OUT), { recursive: true });
  const payload = JSON.stringify(catalog);
  writeFileSync(OUT, payload);
  writeFileSync(PUBLIC_OUT, payload);
  console.log(`Wrote ${tools.length} tools -> ${OUT} (+ public copy)`);
  return catalog;
}

if (isMain) {
  try {
    aggregateCatalog();
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
