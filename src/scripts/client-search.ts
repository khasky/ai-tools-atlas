import type { Catalog } from "../types/catalog";
import { searchTools } from "../lib/searchLogic";
import { publicAsset, withBase } from "../lib/paths";
import { inlineMarkdownLinksToHtml } from "../lib/inline-markdown";

async function loadCatalog(): Promise<Catalog> {
  const res = await fetch(publicAsset("data/catalog.json"));
  if (!res.ok) throw new Error("Failed to load catalog");
  return res.json() as Promise<Catalog>;
}

export async function initSearchPage(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q") ?? "";
  const input = document.getElementById("search-q") as HTMLInputElement | null;
  const status = document.getElementById("search-status");
  const list = document.getElementById("search-results");
  if (!list) return;
  if (input) input.value = q;

  if (!q.trim()) {
    if (status) status.textContent = "Enter a query to search the catalog.";
    list.innerHTML = "";
    return;
  }

  if (status) status.textContent = "Loading…";
  try {
    const catalog = await loadCatalog();
    const tools = catalog.tools.filter((t) => t.status === "published");
    const hits = searchTools(tools, q, 200);
    if (status) {
      status.textContent = `${hits.length} result${hits.length === 1 ? "" : "s"} for “${q}”.`;
    }
    list.innerHTML = hits
      .map(
        (t) => `
      <article class="rounded-xl border border-ink-200 bg-white p-5 shadow-sm">
        <div class="min-w-0 flex-1">
          <a class="font-display text-lg font-semibold text-ink-950 hover:text-accent" href="${escapeHtml(withBase(`/tools/${t.slug}`))}">${escapeHtml(t.canonical_name)}</a>
          <p class="mt-1 max-w-2xl text-sm text-ink-600">${inlineMarkdownLinksToHtml(t.short_description)}</p>
          <div class="mt-2 flex flex-wrap gap-2 text-xs text-ink-500">
            <span class="rounded-full bg-ink-100 px-2 py-0.5">${escapeHtml(t.primary_category_slug)}</span>
          </div>
        </div>
      </article>`
      )
      .join("");
  } catch {
    if (status) status.textContent = "Could not load catalog.";
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
