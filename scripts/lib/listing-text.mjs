/**
 * Heuristics for awesome-list markdown lines: junk link labels, primary URL choice, fallback titles from URLs.
 * Used by fetch-awesome-sources.mjs and aggregate-catalog.mjs.
 */

/** Link text that should not become the catalog title (badges, sources, hashtags, @handles). */
export function isJunkLinkLabel(label) {
  const t = (label || "").trim();
  if (t.length < 2) return true;
  const lower = t.toLowerCase();
  if (/^\(source\)$|^\(sources\)$|^\(docs\)$|^\(documentation\)$|^\(repo\)$|^\(repository\)$|^\(code\)$|^\(website\)$|^\(link\)$|^\(github\)$/i.test(t)) {
    return true;
  }
  if (/^(source|sources|docs|documentation|repo|repository|code|website|link|github)$/i.test(lower)) return true;
  if (/^#[\w-]{1,48}$/i.test(t)) return true;
  if (/^@\w[\w-]{0,40}$/i.test(t)) return true;
  if (t === "🔗" || /^link$/i.test(t)) return true;
  return false;
}

export function prettifySlugPart(s) {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Derive a human title from a product or GitHub URL when the markdown label is useless. */
export function titleFromWebsiteUrl(href) {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "github.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return prettifySlugPart(parts[1].replace(/\.git$/i, ""));
      }
      if (parts.length === 1) {
        return prettifySlugPart(parts[0]);
      }
      return null;
    }
    const segments = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last.length < 60 && !/\.[a-z0-9]{2,4}$/i.test(last)) {
      return prettifySlugPart(last.replace(/\.(html?|php)$/i, ""));
    }
    const leaf = host.split(".")[0];
    return leaf ? leaf.charAt(0).toUpperCase() + leaf.slice(1) : null;
  } catch {
    return null;
  }
}

/** Plain text from a markdown table cell: strip images, keep link anchor text only, decode common HTML entities. */
export function plainTextFromMarkdownTableCell(cell) {
  let s = String(cell || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  s = s.replace(/\[([^\]]*)\]\([^)]+\)/g, (_, label) => String(label || "").trim());
  s = s.replace(/\*\*/g, "").replace(/`/g, "").trim();
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Cells that are not usable as a tool description (status emoji, placeholder). */
export function isNoiseTableDescriptionCell(plain) {
  if (!plain) return true;
  if (plain === ".") return true;
  if (/^:[a-z0-9_+-]+:$/i.test(plain)) return true;
  return false;
}

/**
 * Join text from table columns other than the link cell (e.g. Title + Description columns).
 */
export function descriptionFromSiblingTableCells(parts, linkColumnIndex, toolName) {
  const chunks = [];
  const nameLower = (toolName || "").toLowerCase().trim();
  for (let j = 0; j < parts.length; j++) {
    if (j === linkColumnIndex) continue;
    const plain = plainTextFromMarkdownTableCell(parts[j]);
    if (isNoiseTableDescriptionCell(plain)) continue;
    if (nameLower && plain.toLowerCase() === nameLower) continue;
    chunks.push(plain);
  }
  if (!chunks.length) return "";
  return chunks.join(" — ");
}

export function extractMdLinkMatches(line) {
  const re = /\[([^\]]*)\]\(([^)\s]+)\)/g;
  const out = [];
  let m;
  while ((m = re.exec(line)) !== null) {
    if (m.index > 0 && line[m.index - 1] === "!") continue;
    out.push({
      label: m[1].trim(),
      href: m[2].trim(),
      full: m[0],
      index: m.index,
    });
  }
  return out;
}

/** Line text after removing all `[text](url)` spans and list markers. */
export function descriptionAfterRemovingLinks(line, matches) {
  let s = line;
  for (const m of [...matches].sort((a, b) => b.index - a.index)) {
    s = s.slice(0, m.index) + s.slice(m.index + m.full.length);
  }
  s = s.replace(/^[\s>*\d.+\-•]+/, "").trim();
  s = s.replace(/^\[[ xX]\]\s*/, "").trim();
  s = s.replace(/^[—–\-:,\s]+/, "").trim();
  if (!s.length) return null;
  return s.slice(0, 500);
}

export function resolveListingName(label, href) {
  let name = (label || "").replace(/\*\*/g, "").replace(/`/g, "").trim();
  if (isJunkLinkLabel(name)) {
    const fromUrl = titleFromWebsiteUrl(href);
    if (fromUrl) return fromUrl.slice(0, 200);
  }
  const fallback = titleFromWebsiteUrl(href);
  return (name || fallback || "Link").slice(0, 200);
}

/**
 * @param {{ label: string; href: string; full: string; index: number }[]} matches
 * @param {(href: string) => null | { canonical: string }} normalizeUrl
 */
export function pickPrimaryLinkMatch(matches, normalizeUrl) {
  if (!matches.length) return null;
  const usable = [];
  for (const m of matches) {
    const nu = normalizeUrl(m.href);
    if (nu) usable.push({ ...m, nu });
  }
  if (!usable.length) return null;

  const isGithub = (h) => {
    try {
      return new URL(h).hostname.replace(/^www\./i, "").toLowerCase() === "github.com";
    } catch {
      return false;
    }
  };

  const nonJunk = usable.filter((m) => !isJunkLinkLabel(m.label));
  const nonGit = (arr) => arr.filter((m) => !isGithub(m.href));

  const chosen = nonGit(nonJunk)[0] || nonGit(usable)[0] || nonJunk[0] || usable[0];
  const name = resolveListingName(chosen.label, chosen.href);
  return { href: chosen.href, name, nu: chosen.nu };
}
