/** Static taxonomy for the catalog (FACET / JOB / MODALITY / DOMAIN). */

export const JOBS = [
  { slug: "write", name: "Write & draft", axis: "JOB" },
  { slug: "summarize", name: "Summarize", axis: "JOB" },
  { slug: "research", name: "Research", axis: "JOB" },
  { slug: "transcribe", name: "Transcribe", axis: "JOB" },
  { slug: "generate-images", name: "Generate images", axis: "JOB" },
  { slug: "edit-video", name: "Edit video", axis: "JOB" },
  { slug: "build-websites", name: "Build websites", axis: "JOB" },
  { slug: "code", name: "Code & build", axis: "JOB" },
  { slug: "automate-workflows", name: "Automate workflows", axis: "JOB" },
  { slug: "presentations", name: "Presentations", axis: "JOB" },
  { slug: "customer-support", name: "Customer support", axis: "JOB" },
  { slug: "seo", name: "SEO", axis: "JOB" },
  { slug: "sales-outreach", name: "Sales outreach", axis: "JOB" },
  { slug: "learning", name: "Learning & tutoring", axis: "JOB" },
  { slug: "data-analysis", name: "Data analysis", axis: "JOB" },
];

export const MODALITIES = [
  { slug: "text", name: "Text", axis: "MODALITY" },
  { slug: "image", name: "Image", axis: "MODALITY" },
  { slug: "video", name: "Video", axis: "MODALITY" },
  { slug: "audio", name: "Audio", axis: "MODALITY" },
  { slug: "voice", name: "Voice", axis: "MODALITY" },
  { slug: "code", name: "Code", axis: "MODALITY" },
  { slug: "3d", name: "3D", axis: "MODALITY" },
  { slug: "agent", name: "Agent", axis: "MODALITY" },
  { slug: "search-rag", name: "Search / RAG", axis: "MODALITY" },
  { slug: "multimodal", name: "Multimodal", axis: "MODALITY" },
  { slug: "automation", name: "Automation", axis: "MODALITY" },
];

export const DOMAINS = [
  { slug: "marketing", name: "Marketing", axis: "DOMAIN" },
  { slug: "sales", name: "Sales", axis: "DOMAIN" },
  { slug: "support", name: "Support", axis: "DOMAIN" },
  { slug: "design", name: "Design", axis: "DOMAIN" },
  { slug: "education", name: "Education", axis: "DOMAIN" },
  { slug: "legal", name: "Legal", axis: "DOMAIN" },
  { slug: "finance", name: "Finance", axis: "DOMAIN" },
  { slug: "ecommerce", name: "E-commerce", axis: "DOMAIN" },
  { slug: "developer-tools", name: "Developer tools", axis: "DOMAIN" },
  { slug: "productivity", name: "Productivity", axis: "DOMAIN" },
  { slug: "healthcare", name: "Healthcare", axis: "DOMAIN" },
  { slug: "research", name: "Research", axis: "DOMAIN" },
  { slug: "hr", name: "HR", axis: "DOMAIN" },
];

export const PRIMARY_CATEGORIES = [
  { slug: "ai-code", name: "AI code assistants", job: "code", modality: "code", domain: "developer-tools" },
  { slug: "ai-writing", name: "AI writing", job: "write", modality: "text", domain: "marketing" },
  { slug: "image-gen", name: "Image generation", job: "generate-images", modality: "image", domain: "design" },
  { slug: "video-ai", name: "Video AI", job: "edit-video", modality: "video", domain: "marketing" },
  { slug: "meetings", name: "Meetings & notes", job: "transcribe", modality: "audio", domain: "productivity" },
  { slug: "agents", name: "AI agents", job: "automate-workflows", modality: "agent", domain: "productivity" },
  { slug: "search", name: "AI search", job: "research", modality: "search-rag", domain: "research" },
  {
    slug: "customer-support-ai",
    name: "Support automation",
    job: "customer-support",
    modality: "text",
    domain: "support",
  },
  { slug: "sales-ai", name: "Sales AI", job: "sales-outreach", modality: "text", domain: "sales" },
  { slug: "data-ai", name: "Data & analytics AI", job: "data-analysis", modality: "text", domain: "finance" },
  {
    slug: "presentation-ai",
    name: "Presentation AI",
    job: "presentations",
    modality: "multimodal",
    domain: "education",
  },
  { slug: "seo-ai", name: "SEO AI", job: "seo", modality: "text", domain: "marketing" },
];

export function buildCategories() {
  const list = [];
  let id = 1;
  for (const j of JOBS) {
    list.push({
      id: String(id++),
      slug: j.slug,
      name: j.name,
      axis_type: "JOB",
      parent_id: null,
      description: `Tools for ${j.name.toLowerCase()}.`,
      sort_weight: id,
    });
  }
  for (const m of MODALITIES) {
    list.push({
      id: String(id++),
      slug: m.slug,
      name: m.name,
      axis_type: "MODALITY",
      parent_id: null,
      description: `${m.name} modality tools.`,
      sort_weight: id,
    });
  }
  for (const d of DOMAINS) {
    list.push({
      id: String(id++),
      slug: d.slug,
      name: d.name,
      axis_type: "DOMAIN",
      parent_id: null,
      description: `Tools for ${d.name.toLowerCase()} teams.`,
      sort_weight: id,
    });
  }
  for (const c of PRIMARY_CATEGORIES) {
    list.push({
      id: String(id++),
      slug: c.slug,
      name: c.name,
      axis_type: "FACET",
      parent_id: null,
      description: `Curated facet: ${c.name}.`,
      sort_weight: id,
    });
  }
  return list;
}
