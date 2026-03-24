export type AxisType = "JOB" | "MODALITY" | "DOMAIN" | "FACET";

export interface Category {
  id: string;
  slug: string;
  name: string;
  axis_type: AxisType;
  parent_id: string | null;
  description: string;
  sort_weight: number;
}

export type PricingModel = "FREE" | "FREEMIUM" | "PAID" | "API_BASED" | "CUSTOM" | "UNKNOWN";

export type ConfidenceGrade = "A" | "B" | "C" | "D" | "E";

export interface Tool {
  id: string;
  slug: string;
  canonical_name: string;
  aliases: string[];
  short_description: string;
  long_description: string;
  website_url: string;
  app_url?: string;
  pricing_url?: string;
  docs_url?: string;
  changelog_url?: string;
  privacy_url?: string;
  terms_url?: string;
  company: { name: string; domain: string };
  primary_category_slug: string;
  secondary_category_slugs: string[];
  use_case_slugs: string[];
  modality_slugs: string[];
  domain_slugs: string[];
  capability_tags: string[];
  pricing_model: PricingModel;
  deployment: string[];
  platforms: string[];
  integrations: string[];
  screenshots: { url: string; alt: string }[];
  best_for: string;
  watchouts: string;
  alternative_slugs: string[];
  last_verified_at: string;
  first_seen_at: string;
  published_at: string;
  /** Null when not computed (listing-only ingest). */
  signal_rank_overall: number | null;
  signal_rank_category_percentile: number | null;
  adoption_score: number | null;
  reputation_score: number | null;
  maintenance_score: number | null;
  trust_transparency_score: number | null;
  momentum_score: number | null;
  ecosystem_authority_score: number | null;
  confidence_grade: ConfidenceGrade;
  ranking_explanation_tokens: string[];
  sponsored: boolean;
  evidence_summary: { label: string; value: string }[];
  activity_timeline: { date: string; label: string }[];
  external_links: { type: string; url: string; label: string }[];
  open_source: boolean;
  enterprise_ready: boolean;
  free_plan_available: boolean;
  api_docs_available: boolean;
  security_compliance: string[];
  status: string;
}

export interface EditorialPage {
  slug: string;
  title: string;
  summary: string;
  tool_slugs: string[];
}

export interface Catalog {
  generated_at: string;
  version: number;
  /** Present when catalog is built from aggregated source JSON (v2 pipeline). */
  aggregation_note?: string;
  categories: Category[];
  tools: Tool[];
  editorial_pages: EditorialPage[];
  methodology?: {
    weights: Record<string, number>;
  };
}
