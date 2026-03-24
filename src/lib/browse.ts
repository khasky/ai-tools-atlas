import { allTools } from "./catalog";
import type { Tool } from "../types/catalog";

export function toolsForFacet(slug: string): Tool[] {
  return allTools.filter(
    (t) => t.primary_category_slug === slug || t.secondary_category_slugs.includes(slug)
  );
}

export function toolsForJob(slug: string): Tool[] {
  return allTools.filter((t) => t.use_case_slugs.includes(slug));
}

export function toolsForModality(slug: string): Tool[] {
  return allTools.filter((t) => t.modality_slugs.includes(slug));
}

export function toolsForDomain(slug: string): Tool[] {
  return allTools.filter((t) => t.domain_slugs.includes(slug));
}
