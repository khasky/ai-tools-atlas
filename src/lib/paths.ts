/**
 * Prefix app routes and static assets with `import.meta.env.BASE_URL`
 * (required for GitHub Pages project sites and similar subdirectory deploys).
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  let p = path.startsWith("/") ? path : `/${path}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (!base || base === "/") return p || "/";
  const b = base.replace(/\/$/, "");
  if (p === "/" || p === "") return b;
  return `${b}${p}`;
}

/** Public folder asset (e.g. `data/catalog.json`). */
export function publicAsset(path: string): string {
  const p = path.replace(/^\//, "");
  const base = import.meta.env.BASE_URL || "/";
  if (base === "/") return `/${p}`;
  return `${base.replace(/\/?$/, "/")}${p}`;
}
