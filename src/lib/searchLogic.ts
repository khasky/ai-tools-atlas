import type { Tool } from "../types/catalog";
import { plainTextFromMarkdown } from "./inline-markdown";

/** FR-SEARCH-2 synonym expansion (query rewriting hints). */
const PHRASE_SYNONYMS: [string, string[]][] = [
  ["coding ai", ["code", "coding", "assistant", "copilot", "developer"]],
  ["code assistant", ["code", "coding", "assistant"]],
  ["meeting notes", ["transcription", "meeting", "notes", "summarize"]],
  ["video clips", ["video", "short", "clip", "repurpose", "edit"]],
  ["ai writer", ["write", "writing", "copy"]],
  ["image gen", ["image", "generate", "diffusion"]],
];

export function expandQuery(raw: string): string[] {
  const q = raw.toLowerCase().trim();
  if (!q) return [];
  const terms = new Set<string>(q.split(/\s+/).filter(Boolean));
  for (const [phrase, adds] of PHRASE_SYNONYMS) {
    if (q.includes(phrase)) {
      adds.forEach((a) => terms.add(a));
    }
  }
  return [...terms];
}

function haystack(t: Tool): string {
  return [
    t.canonical_name,
    ...t.aliases,
    plainTextFromMarkdown(t.short_description),
    plainTextFromMarkdown(t.long_description),
    t.company.name,
    t.primary_category_slug,
    ...t.secondary_category_slugs,
    ...t.use_case_slugs,
    ...t.modality_slugs,
    ...t.domain_slugs,
    ...t.capability_tags,
    ...t.integrations,
    ...t.deployment,
    ...t.platforms,
    t.pricing_model,
  ]
    .join(" ")
    .toLowerCase();
}

export function searchTools(tools: Tool[], raw: string, limit = 120): Tool[] {
  const terms = expandQuery(raw);
  if (!terms.length) return [];
  const scored = tools
    .map((t) => {
      const h = haystack(t);
      let score = 0;
      for (const term of terms) {
        if (!term) continue;
        if (t.slug.includes(term)) score += 12;
        if (t.canonical_name.toLowerCase().includes(term)) score += 10;
        const idx = h.indexOf(term);
        if (idx >= 0) score += 4 + Math.min(3, Math.floor(120000 / (idx + 1)));
        const re = new RegExp(`\\b${escapeRe(term)}\\b`, "g");
        const m = h.match(re);
        if (m) score += m.length * 2;
      }
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.t.canonical_name.localeCompare(b.t.canonical_name));
  return scored.slice(0, limit).map((x) => x.t);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
