/**
 * Keep only markdown under an H2 range (inclusive of inner ### content, exclusive of sibling ## sections).
 * Used when a README mixes courses, jobs, license, etc. with a dedicated "Tools" section.
 */

/**
 * @param {string} markdown
 * @param {(h2Title: string) => boolean} startWhen — first H2 title (without `## `) that begins capture
 * @param {(h2Title: string) => boolean | null} [endWhen] — another H2 at same level ends capture before this section; omit = until EOF
 * @returns {{ text: string; matched: boolean }}
 */
export function sliceMarkdownBetweenH2Headings(markdown, startWhen, endWhen) {
  if (!startWhen) return { text: markdown, matched: true };
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let capturing = false;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      const title = m[1].trim();
      if (!capturing) {
        if (startWhen(title)) capturing = true;
        continue;
      }
      if (endWhen && endWhen(title)) break;
      continue;
    }
    if (capturing) out.push(line);
  }
  return { text: out.join("\n"), matched: capturing };
}
