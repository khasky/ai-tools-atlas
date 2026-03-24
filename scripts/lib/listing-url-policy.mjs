/**
 * Filters URLs that are not product/tool homepages (licenses, specs, localhost, etc.).
 * Used by fetch-awesome-sources and aggregate-catalog.
 */

const DISALLOWED_HOSTS = new Set([
  "creativecommons.org",
  "i.creativecommons.org",
  "licensebuttons.net",
  "choosealicense.com",
  "opensource.org",
  "spdx.org",
  "unlicense.org",
  "www.w3.org",
  "validator.w3.org",
  "schemas.microsoft.com",
  "json-schema.org",
  "example.com",
  "example.org",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
]);

/**
 * @param {string} href
 * @returns {boolean} true if this URL must not become a catalog tool row
 */
export function isDisallowedListingUrl(href) {
  try {
    const u = new URL(href);
    if (u.protocol !== "http:" && u.protocol !== "https:") return true;
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const path = u.pathname.toLowerCase();
    const search = u.search.toLowerCase();

    if (host === "localhost" || host.endsWith(".localhost") || /^127\.\d+\.\d+\.\d+$/.test(host)) return true;

    for (const h of DISALLOWED_HOSTS) {
      if (host === h || host.endsWith(`.${h}`)) return true;
    }

    if (path.includes("/publicdomain/zero/") || path.includes("/publicdomain/mark/1.0/")) return true;
    if (path.includes("/licenses/") && (host === "opensource.org" || host === "gnu.org" || host === "apache.org"))
      return true;
    if ((host === "www.apache.org" || host === "apache.org") && path.includes("/licenses/")) return true;
    if ((host === "www.gnu.org" || host === "gnu.org") && path.includes("/licenses/")) return true;

    if (host === "github.com") {
      if (/\/(blob|raw)\/[^/]+\/[^/]+\/license(\.|$)/i.test(u.pathname)) return true;
      if (/\/license(\?|$)/i.test(u.pathname) && u.pathname.split("/").filter(Boolean).length <= 2) return true;
    }

    if (host === "img.shields.io" || host === "badgen.net" || host === "codecov.io") return true;

    if (path.endsWith("/license") || path.endsWith("/license/")) return true;
    if (/\.(md|txt|rst)$/i.test(path) && host === "github.com" && path.includes("/blob/")) return true;

    if (search.includes("utm_medium=badge") || search.includes("utm_source=badge")) return true;

    return false;
  } catch {
    return true;
  }
}
