/**
 * Records HTTP metadata for major AI directory homepages named in the product spec (PRD §2).
 * This does not scrape tool listings (often behind client-side apps); it documents sources reviewed.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

const DIRECTORY_URLS = [
  { id: "futurepedia", url: "https://www.futurepedia.io/" },
  { id: "toolify", url: "https://www.toolify.ai/" },
  { id: "topai_tools", url: "https://topai.tools/categories" },
  { id: "aixploria", url: "https://www.aixploria.com/en/" },
  { id: "aixploria_free", url: "https://www.aixploria.com/en/free-ai/" },
  { id: "aidirectory24", url: "https://aidirectory24.com/" },
];

export async function fetchDirectoryLandings() {
  const outDir = path.join(__dirname, "..", "data", "sources");
  mkdirSync(outDir, { recursive: true });
  const entries = [];

  for (const d of DIRECTORY_URLS) {
    try {
      const res = await fetch(d.url, {
        redirect: "follow",
        headers: { "User-Agent": "ai-tools-directory/1.0 (directory survey)" },
      });
      const ct = res.headers.get("content-type") || "";
      entries.push({
        id: d.id,
        url: d.url,
        final_url: res.url,
        status: res.status,
        content_type: ct.split(";")[0] || ct,
        fetched_at: new Date().toISOString(),
      });
    } catch (e) {
      entries.push({
        id: d.id,
        url: d.url,
        error: String(e?.message || e),
        fetched_at: new Date().toISOString(),
      });
    }
  }

  const payload = {
    source_id: "prd_directory_landings",
    note: "Landing-page survey for PRD §2 market references; not a tool extract.",
    fetched_at: new Date().toISOString(),
    entries,
  };
  const out = path.join(outDir, "prd_directory_landings.json");
  writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote directory landing survey -> ${out}`);
}

if (isMain) {
  fetchDirectoryLandings().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
