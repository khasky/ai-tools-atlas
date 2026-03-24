/**
 * Downloads curated awesome-list README files (raw GitHub) and extracts tool rows.
 * - Per-repo optional H2 span (tools-only sections for mixed READMEs).
 * - Tables: name / description / link heuristics (incl. 🔗 link column).
 * - Bullets: only real list items (`-`, `*`, `1.`), not license badges or paragraphs.
 * - URL policy drops licenses, CC0, localhost, etc.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  extractMdLinkMatches,
  descriptionAfterRemovingLinks,
  pickPrimaryLinkMatch,
  resolveListingName,
  isJunkLinkLabel,
  descriptionFromSiblingTableCells,
  plainTextFromMarkdownTableCell,
} from "./lib/listing-text.mjs";
import { isDisallowedListingUrl } from "./lib/listing-url-policy.mjs";
import { isNonEnglishCatalogBlurb } from "./lib/listing-en-locale.mjs";
import { sliceMarkdownBetweenH2Headings } from "./lib/readme-h2-slice.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

/**
 * @typedef {{
 *   source_id: string;
 *   list_name: string;
 *   raw_readme_url: string;
 *   homepage: string;
 *   h2_slice?: { start: (title: string) => boolean; end?: (title: string) => boolean };
 *   parser?: "default" | "ai_collection_cards";
 * }} AwesomeSource
 */

/** @type {AwesomeSource[]} */
const SOURCES = [
  {
    source_id: "awesome_ai_devtools",
    list_name: "Awesome AI-Powered Developer Tools",
    raw_readme_url: "https://raw.githubusercontent.com/jamesmurdza/awesome-ai-devtools/main/README.md",
    homepage: "https://github.com/jamesmurdza/awesome-ai-devtools",
  },
  {
    source_id: "awesome_artificial_intelligence",
    list_name: "Awesome Artificial Intelligence (owainlewis)",
    raw_readme_url: "https://raw.githubusercontent.com/owainlewis/awesome-artificial-intelligence/master/README.md",
    homepage: "https://github.com/owainlewis/awesome-artificial-intelligence",
    h2_slice: {
      start: (t) => /\btools\b/i.test(t),
      end: undefined,
    },
  },
  {
    source_id: "top_ai_tools",
    list_name: "Top AI Tools (ghimiresunil)",
    raw_readme_url: "https://raw.githubusercontent.com/ghimiresunil/Top-AI-Tools/main/README.md",
    homepage: "https://github.com/ghimiresunil/Top-AI-Tools",
  },
  {
    source_id: "awesome_ai_tools_mahseema",
    list_name: "Awesome AI Tools (mahseema)",
    raw_readme_url: "https://raw.githubusercontent.com/mahseema/awesome-ai-tools/main/README.md",
    homepage: "https://github.com/mahseema/awesome-ai-tools",
  },
  {
    source_id: "awesome_ai_re50urces",
    list_name: "Awesome AI (re50urces)",
    raw_readme_url: "https://raw.githubusercontent.com/re50urces/Awesome-AI/main/README.md",
    homepage: "https://github.com/re50urces/Awesome-AI",
  },
  {
    source_id: "ai_collection_1000",
    list_name: "1000 AI collection tools",
    raw_readme_url: "https://raw.githubusercontent.com/yousefebrahimi0/1000-AI-collection-tools/main/README.md",
    homepage: "https://github.com/yousefebrahimi0/1000-AI-collection-tools",
  },
  {
    source_id: "cloudcommunity_ai_tools",
    list_name: "AI Tools (cloudcommunity)",
    raw_readme_url: "https://raw.githubusercontent.com/cloudcommunity/AI-Tools/main/README.md",
    homepage: "https://github.com/cloudcommunity/AI-Tools",
  },
  {
    source_id: "awesome_ai_hades217",
    list_name: "Awesome AI (hades217)",
    raw_readme_url: "https://raw.githubusercontent.com/hades217/awesome-ai/master/README.md",
    homepage: "https://github.com/hades217/awesome-ai",
    h2_slice: {
      start: (t) => /^artificial intelligence tools$/i.test(t.replace(/\s+/g, " ").trim()),
      end: (t) => /^books$/i.test(t.replace(/\s+/g, " ").trim()),
    },
  },
  {
    source_id: "ai_catalog_mehmetkahya0",
    list_name: "AI-Catalog (mehmetkahya0)",
    raw_readme_url: "https://raw.githubusercontent.com/mehmetkahya0/AI-Catalog/main/README.md",
    homepage: "https://github.com/mehmetkahya0/AI-Catalog",
  },
  {
    source_id: "ai_collection_generative",
    list_name: "The Generative AI Landscape (ai-collection)",
    raw_readme_url: "https://raw.githubusercontent.com/ai-collection/ai-collection/main/README.md",
    homepage: "https://github.com/ai-collection/ai-collection",
    parser: "ai_collection_cards",
  },
  {
    source_id: "awesome_generative_ai_steven2358",
    list_name: "Awesome Generative AI (steven2358)",
    raw_readme_url: "https://raw.githubusercontent.com/steven2358/awesome-generative-ai/main/README.md",
    homepage: "https://github.com/steven2358/awesome-generative-ai",
  },
  {
    source_id: "awesome_aitools_ikaijua",
    list_name: "Awesome AI Tools (ikaijua)",
    raw_readme_url: "https://raw.githubusercontent.com/ikaijua/Awesome-AITools/main/README.md",
    homepage: "https://github.com/ikaijua/Awesome-AITools",
  },
];

/** Bullet / loose line: optional leading list markers, one primary [text](url), trailing description. */
const LINK_LINE = /^[\s>*-]*\[([^\]]+)\]\(([^)]+)\)\s*(?:[—–-]\s*)?(.*)$/;

/** Must look like a markdown list item (not a bare paragraph with a link — avoids CC0 badges, prose). */
const LIST_ITEM_START = /^\s*(?:[-*+]|\d+[.)])\s+/;

function stripMarkdownImages(s) {
  return s.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
}

function isNonToolAssetUrl(href) {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const p = u.pathname.toLowerCase();
    if (host === "awesome.re" || host === "img.shields.io" || host === "badgen.net") return true;
    if (p.endsWith(".svg") || p.endsWith(".png") || p.endsWith(".gif")) return true;
    if (/\/badge[^/]*\.(svg|png)$/i.test(p)) return true;
    return false;
  } catch {
    return true;
  }
}

const EXCLUDED_HOST_HINTS = [
  "arxiv.org",
  "youtube.com",
  "youtu.be",
  "giphy.com",
  "oreilly.com",
  "stanford.edu",
  "mit.edu",
  "web.stanford.edu",
  "deeplearningbook.org",
  "cloudskillsboost.google.com",
];

function isNoisyGitHubPath(pathname) {
  return /\/(blob|tree|commits?|pull|issues|wiki|actions|security|network)\//i.test(pathname);
}

function normalizeUrl(href) {
  try {
    if (isDisallowedListingUrl(href)) return null;
    const u = new URL(href);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.hostname === "raw.githubusercontent.com") return null;
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "github.com" && isNoisyGitHubPath(u.pathname)) return null;
    if (host === "huggingface.co") {
      const p = u.pathname.toLowerCase();
      if (p.startsWith("/spaces/") || p.startsWith("/models/") || p.startsWith("/datasets/")) return null;
    }
    const h = host + u.pathname.toLowerCase();
    if (EXCLUDED_HOST_HINTS.some((x) => h.includes(x))) return null;
    if (u.pathname.toLowerCase().endsWith(".pdf")) return null;
    if (isNonToolAssetUrl(href)) return null;
    const pathname = u.pathname.replace(/\/$/, "") || "";
    let display = u.href.split("#")[0];
    try {
      const du = new URL(display);
      du.search = "";
      display = du.href.replace(/\/$/, "") || du.origin + "/";
    } catch {
      /* keep display */
    }
    return { canonical: `https://${host}${pathname || "/"}`, display };
  } catch {
    return null;
  }
}

function isTableSeparatorRow(t) {
  const s = t.trim();
  if (!s.startsWith("|") || !s.endsWith("|")) return false;
  const cells = s
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function coalesceBrokenMarkdownTableRows(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) {
      out.push(line);
      i++;
      continue;
    }
    let acc = line;
    i++;
    while (i < lines.length) {
      const nt = lines[i].trim();
      if (!nt) break;
      if (nt.startsWith("|")) break;
      if (nt.startsWith("#") || nt.startsWith("```")) break;
      acc += " " + nt;
      i++;
    }
    out.push(acc);
  }
  return out;
}

function isSkippedReadmeH2(title) {
  const n = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (n === "license" || n === "licence") return true;
  if (n === "contributing" || n === "contribution guidelines" || n.startsWith("how to contribute")) return true;
  if (n.startsWith("code of conduct")) return true;
  if (n.startsWith("acknowledg")) return true;
  if (n === "authors" || n === "maintainers") return true;
  if (n === "table of contents" || n === "contents" || n === "toc") return true;
  if (n.startsWith("footnote")) return true;
  return false;
}

/**
 * ai-collection README: `### Tool Name` … `#### description` … `[Visit](https://thataicollection.com/redirect/...)`
 * (no list markers — HTML-heavy file).
 */
function extractAiCollectionCardLayout(markdown, source) {
  const lines = markdown.split(/\r?\n/);
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {{ name: string; website_url: string; description: string | null; source_list: string }[]} */
  const items = [];
  let pendingName = "";
  let pendingDesc = "";

  function pushCard(name, href, desc) {
    if (!name || !href || isDisallowedListingUrl(href)) return;
    const nu = normalizeUrl(href);
    if (!nu || seen.has(nu.canonical)) return;
    seen.add(nu.canonical);
    const safeDesc = desc && !isNonEnglishCatalogBlurb(desc) ? desc.slice(0, 500) : null;
    items.push({
      name: name.replace(/\s+/g, " ").trim().slice(0, 200),
      website_url: nu.display.split("#")[0],
      description: safeDesc,
      source_list: source.source_id,
    });
  }

  for (const line of lines) {
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      const raw = h3[1].replace(/<[^>]+>/g, "").trim();
      if (raw.length > 120 || /list of awesome|featured on ai collection/i.test(raw)) {
        pendingName = "";
        pendingDesc = "";
        continue;
      }
      if (raw.length > 1 && raw.length < 180 && !/^#{1,6}\s/.test(raw)) {
        pendingName = raw;
        pendingDesc = "";
      }
      continue;
    }
    const h4 = line.match(/^####\s+(.+)$/);
    if (h4) {
      pendingDesc = h4[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 500);
      continue;
    }
    const vm = line.match(/^\[Visit\]\((https:\/\/thataicollection\.com\/redirect\/[^)]+)\)/i);
    if (vm && pendingName) {
      const href = vm[1].split("?")[0];
      pushCard(pendingName, href, pendingDesc || null);
      pendingName = "";
      pendingDesc = "";
    }
  }
  return items;
}

function extractFromMarkdownTable(line) {
  const t = line.trim();
  if (!t.startsWith("|") || !t.endsWith("|")) return [];
  if (isTableSeparatorRow(t)) return [];
  const parts = t.split("|").map((s) => stripMarkdownImages(s.trim()));
  /** @type {{ name: string; href: string; rowDescription: string }[]} */
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const cell = parts[i];
    const lm = cell.match(/\[([^\]]*)\]\(([^)\s]+)\)/);
    if (!lm) continue;
    const href = lm[2].trim();
    if (!/^https?:/i.test(href)) continue;
    let name = (lm[1] || "").trim();
    const prevRaw =
      i > 0
        ? parts[i - 1]
            .replace(/\*\*/g, "")
            .replace(/`/g, "")
            .replace(/^\[[ x]\]\s*/i, "")
            .trim()
        : "";
    const nameFromTwoLeft = i >= 2 ? plainTextFromMarkdownTableCell(parts[i - 2]) : "";
    const genericLinkLabel = !name || name === "🔗" || name === "Link" || name === "link" || isJunkLinkLabel(name);

    if (genericLinkLabel && nameFromTwoLeft) {
      name = resolveListingName(nameFromTwoLeft, href);
    } else if (genericLinkLabel && prevRaw && !/^https?:/i.test(prevRaw) && prevRaw.length < 500) {
      name = resolveListingName(prevRaw, href);
    } else if (i > 0 && prevRaw && !/^https?:/i.test(prevRaw) && prevRaw.length < 220) {
      if (!name || isJunkLinkLabel(name)) name = resolveListingName(prevRaw, href);
      else name = resolveListingName(name, href);
    } else {
      name = resolveListingName(name, href);
    }

    const rowDescription = descriptionFromSiblingTableCells(parts, i, name);
    out.push({ name, href, rowDescription });
  }
  return out;
}

/**
 * @param {string} markdown
 * @param {AwesomeSource} source
 */
function extractItems(markdown, source) {
  const items = [];
  /** @type {Set<string>} */
  const seen = new Set();
  const rawLines = coalesceBrokenMarkdownTableRows(markdown.split(/\r?\n/));

  let skipSection = false;
  const lines = [];
  for (const line of rawLines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      skipSection = isSkippedReadmeH2(h2[1]);
      continue;
    }
    if (skipSection) continue;
    lines.push(line);
  }

  function pushItem(title, href, desc) {
    if (!href || href.startsWith("#") || href.startsWith("/")) return;
    if (isDisallowedListingUrl(href) || isNonToolAssetUrl(href)) return;
    const nu = normalizeUrl(href);
    if (!nu || seen.has(nu.canonical)) return;
    seen.add(nu.canonical);
    const cleanTitle = title
      .replace(/^🔗\s*/, "")
      .replace(/\*\*/g, "")
      .trim()
      .slice(0, 200);
    const safeDesc = desc && !isNonEnglishCatalogBlurb(desc) ? desc.slice(0, 500) : null;
    items.push({
      name: cleanTitle || "Link",
      website_url: nu.display.split("#")[0],
      description: safeDesc,
      source_list: source.source_id,
    });
  }

  function lineLooksLikeListItem(trimmed) {
    const unquoted = trimmed.replace(/^>\s*/, "");
    return LIST_ITEM_START.test(unquoted);
  }

  for (const line of lines) {
    const deimg = stripMarkdownImages(line);
    const bullet = deimg.match(LINK_LINE);
    const bulletDesc = bullet ? (bullet[3] || "").trim() : "";

    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.includes("http") && !isTableSeparatorRow(trimmed)) {
      const tableHits = extractFromMarkdownTable(line);
      if (tableHits.length) {
        for (const { name, href, rowDescription } of tableHits) {
          const tableDesc = rowDescription ? rowDescription.slice(0, 500) : "";
          const merged = [tableDesc, bulletDesc].filter(Boolean).join(" — ").slice(0, 500) || null;
          pushItem(name, href, merged);
        }
        continue;
      }
    }

    if (!lineLooksLikeListItem(trimmed)) continue;

    const matches = extractMdLinkMatches(deimg);
    if (matches.length === 0) continue;

    const descFromLine = descriptionAfterRemovingLinks(deimg, matches);
    const desc = (descFromLine && descFromLine.length ? descFromLine : null) || (bulletDesc || null);

    const primary = pickPrimaryLinkMatch(matches, normalizeUrl);
    if (!primary) continue;

    pushItem(primary.name, primary.href, desc);

    const primaryCanon = primary.nu.canonical;
    for (const m of matches) {
      const nu = normalizeUrl(m.href);
      if (!nu || nu.canonical === primaryCanon) continue;
      if (isJunkLinkLabel(m.label)) continue;
      pushItem(resolveListingName(m.label, m.href), m.href, desc);
    }
  }

  return items;
}

export async function fetchAwesomeSources() {
  const outDir = path.join(__dirname, "..", "data", "sources");
  mkdirSync(outDir, { recursive: true });

  for (const source of SOURCES) {
    const res = await fetch(source.raw_readme_url, {
      headers: { "User-Agent": "ai-tools-directory/1.0 (catalog fetch)" },
    });
    if (!res.ok) {
      console.warn(`Skip ${source.source_id}: HTTP ${res.status} ${source.raw_readme_url}`);
      continue;
    }
    const markdown = await res.text();
    let workMd = markdown;
    if (source.h2_slice) {
      const { text, matched } = sliceMarkdownBetweenH2Headings(
        markdown,
        source.h2_slice.start,
        source.h2_slice.end ?? null,
      );
      if (matched) workMd = text;
      else console.warn(`${source.source_id}: H2 slice did not match; using full README`);
    }
    const items =
      source.parser === "ai_collection_cards"
        ? extractAiCollectionCardLayout(workMd, source)
        : extractItems(workMd, source);
    const payload = {
      source_id: source.source_id,
      source_homepage: source.homepage,
      list_name: source.list_name,
      raw_readme_url: source.raw_readme_url,
      fetched_at: new Date().toISOString(),
      item_count: items.length,
      items,
    };
    const file = path.join(outDir, `${source.source_id}.json`);
    writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
    console.log(`Wrote ${items.length} awesome-list links -> ${file}`);
  }
}

if (isMain) {
  fetchAwesomeSources().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
