/**
 * Catalog display titles: ASCII letters/digits + a small safe punctuation set (no emoji / odd Unicode).
 */

const ALLOWED = /[^A-Za-z0-9 \-'.&,():/+%]/g;

/**
 * @param {string} raw
 * @param {number} [maxLen]
 */
export function sanitizeCatalogTitle(raw, maxLen = 200) {
  let s = String(raw || "")
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, " ");
  s = s.replace(ALLOWED, " ");
  s = s.replace(/\s+/g, " ").replace(/-+/g, "-").trim();
  if (!s.length) return "Untitled";
  return s.slice(0, maxLen).trim();
}
