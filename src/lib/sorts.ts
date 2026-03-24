import type { Tool } from "../types/catalog";
import { excludeSponsored } from "./catalog";

function sortByName(list: Tool[]): Tool[] {
  return list.sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));
}

/**
 * Default browse order: A–Z by display name.
 * Sponsored listings excluded unless `includeSponsored`.
 */
export function sortCatalogTools(tools: Tool[], opts?: { includeSponsored?: boolean }): Tool[] {
  const base = opts?.includeSponsored ? [...tools] : excludeSponsored([...tools]);
  return sortByName(base);
}

export function sortKeyForCategory(toolsInCategory: Tool[]): Tool[] {
  return sortByName(excludeSponsored([...toolsInCategory]));
}

export function sortFreeTools(tools: Tool[]): Tool[] {
  const list = excludeSponsored([...tools]).filter((t) => t.free_plan_available || t.pricing_model === "FREE");
  return sortByName(list);
}

export function sortOpenSourceTools(tools: Tool[]): Tool[] {
  const list = excludeSponsored([...tools]).filter((t) => t.open_source);
  return sortByName(list);
}

export function sortEnterpriseTools(tools: Tool[]): Tool[] {
  const list = excludeSponsored([...tools]).filter((t) => t.enterprise_ready);
  return sortByName(list);
}
