/** Central SEO / branding (single source of truth for meta + JSON-LD). */

import { withBase } from "./paths";

export const SITE_NAME = "AI Tools Atlas";

export const DEFAULT_DESCRIPTION =
  "AI products and services from public awesome-style lists. Search and filter without an account.";

export const REPO_URL = "https://github.com/khasky/ai-tools-atlas";

export const AUTHOR_LOGIN = "khasky";

/** GitHub profile — `rel="author"`, JSON-LD Person / publisher. Use `REPO_URL` for the project. */
export const AUTHOR_URL = "https://github.com/khasky";

/** Protocol + host from `astro.config` `site` (no path). */
export function siteOrigin(): string {
  return (import.meta.env.SITE as string | undefined)?.replace(/\/$/, "") ?? "";
}

/** Canonical public site root including `base` (no trailing slash). Override with `PUBLIC_SITE_URL` for a custom domain. */
export function configuredSiteUrl(): string {
  const fromEnv = import.meta.env.PUBLIC_SITE_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, "");
  const origin = siteOrigin();
  if (!origin) return "";
  const base = (import.meta.env.BASE_URL as string) || "/";
  if (base === "/" || base === "") return origin;
  return `${origin}${base.replace(/\/$/, "")}`;
}

/** Absolute URL for a logical path (applies `withBase` to the path segment). */
export function absoluteUrl(logicalPath: string): string {
  const o = siteOrigin();
  if (!o) return withBase(logicalPath);
  return `${o}${withBase(logicalPath)}`;
}
