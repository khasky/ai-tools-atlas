# AI Tools Atlas

Directory of AI products. There is no sign-up; you browse, filter, and leave.

## What you will find

- One merged catalog with search and browse.
- Categories and facets (use cases, modalities, domains) and a short profile per tool with outbound links.
- English-only listings with fallbacks when a source blurb is missing or not English; titles are normalized for display.
- One entry per product where the pipeline can tell: merge on canonical website URL, then again on matching display names when the same tool appears under different links.

## How it is built

The live site is static HTML from a single aggregated JSON catalog. Snapshots come from configured GitHub lists; parsing handles tables, list items, and a few repo-specific layouts, then everything is deduplicated and enriched offline. No database and no made-up vendors.
