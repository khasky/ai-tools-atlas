/**
 * Catalog copy is English-only: drop CJK / Hangul–heavy blurbs (no machine translation in pipeline).
 */

export function latinLetterCount(s) {
  return (String(s).match(/[A-Za-z]/g) || []).length;
}

/** Hiragana, Katakana, CJK Unified, Hangul syllables */
function eastAsianScriptCount(s) {
  return (
    String(s).match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g) || []
  ).length;
}

/**
 * True when text should not be shown as primary catalog description (Japanese/Chinese/Korean–dominant).
 */
export function isNonEnglishCatalogBlurb(s) {
  const t = String(s || "").trim();
  if (t.length < 12) return false;
  const nonSpace = t.replace(/\s/g, "").length;
  if (nonSpace < 10) return false;
  const ea = eastAsianScriptCount(t);
  const lat = latinLetterCount(t);
  if (ea >= 15 && ea >= lat) return true;
  if (ea / nonSpace >= 0.28) return true;
  return false;
}

/**
 * Tool title is unsuitable as English heading (e.g. only Japanese product name).
 */
export function isMostlyNonLatinToolName(name) {
  const t = String(name || "").trim();
  if (t.length < 2) return false;
  const ea = eastAsianScriptCount(t);
  const lat = latinLetterCount(t);
  if (ea >= 4 && ea > lat) return true;
  return false;
}

/**
 * Prefer the better English catalog description when merging duplicate URLs.
 * @param {string | undefined} a
 * @param {string | undefined} b
 */
export function pickEnglishPreferredDescription(a, b) {
  const sa = (a || "").trim();
  const sb = (b || "").trim();
  if (!sa) return sb;
  if (!sb) return sa;
  const aBad = isNonEnglishCatalogBlurb(sa);
  const bBad = isNonEnglishCatalogBlurb(sb);
  if (aBad && !bBad) return sb;
  if (!aBad && bBad) return sa;
  if (aBad && bBad) return sa.length >= sb.length ? sa : sb;
  return sb.length > sa.length ? sb : sa;
}
