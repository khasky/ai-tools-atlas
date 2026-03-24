/** Run all source fetchers (network required). */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fetchAwesomeSources } from "./fetch-awesome-sources.mjs";
import { fetchDirectoryLandings } from "./fetch-directory-landings.mjs";

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

async function main() {
  console.log("Fetching PRD directory landings");
  await fetchDirectoryLandings();
  console.log("Fetching awesome-list sources");
  await fetchAwesomeSources();
  console.log("Done");
}

if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
