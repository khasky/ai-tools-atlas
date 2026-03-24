import type { Catalog, Category, Tool } from "../types/catalog";
import raw from "../data/catalog.json";

export const catalog = raw as Catalog;

export const allTools: Tool[] = catalog.tools.filter((t) => t.status === "published");

export function getCategory(slug: string): Category | undefined {
  return catalog.categories.find((c) => c.slug === slug);
}

export function getTool(slug: string): Tool | undefined {
  return allTools.find((t) => t.slug === slug);
}

export function categoriesByAxis(axis: Category["axis_type"]): Category[] {
  return catalog.categories.filter((c) => c.axis_type === axis).sort((a, b) => a.sort_weight - b.sort_weight);
}

export function primaryCategoryFacets(): Category[] {
  return categoriesByAxis("FACET");
}

export function editorialPage(slug: string) {
  return catalog.editorial_pages.find((p) => p.slug === slug);
}

/** Algorithmic list: sponsored items excluded from default ranking lists (spec). */
export function excludeSponsored(tools: Tool[]): Tool[] {
  return tools.filter((t) => !t.sponsored);
}

export function sponsoredTools(tools: Tool[]): Tool[] {
  return tools.filter((t) => t.sponsored);
}
