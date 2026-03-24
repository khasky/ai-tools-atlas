/** `[label](https://...)` plus bare `https://...` URLs → safe HTML links; escape everything else. */

const mdLinkPattern = () => /\[([^\]]*)\]\((https?:[^)\s]+)\)/g;

/** Private-use placeholders so bare-URL pass does not touch markdown links. */
const PH = (i: number) => `\uE000MDLINK${i}\uE001`;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

/**
 * Drop trailing prose punctuation (including a closing `)` from `(https://…)` wrappers)
 * one character at a time while `new URL` still parses — avoids eating `)` that belongs to
 * paths like Wikipedia `…_(disambiguation)`.
 */
function trimTrailingJunkFromUrl(url: string): string {
  let u = url;
  const junkEnd = /[.,;:!?)\]"'>]$/;
  while (u.length > "https://x".length && junkEnd.test(u)) {
    const next = u.slice(0, -1);
    try {
      const p = new URL(next);
      if (p.protocol !== "http:" && p.protocol !== "https:") break;
      u = next;
    } catch {
      break;
    }
  }
  return u;
}

/** Stop at ASCII / common Unicode quotes so URLs don’t swallow “smart” punctuation after them. */
const bareUrlPattern = () => /https?:\/\/[^\s<>"'\u201C\u201D\u2018\u2019]+/g;

const LINK_CLASS =
  "text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-2";

/** Strip markdown links to visible text only (meta descriptions, JSON-LD). */
export function plainTextFromMarkdown(s: string): string {
  if (!s) return "";
  return s
    .replace(mdLinkPattern(), "$1")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function linkifyBareUrlsInText(s: string): string {
  const re = bareUrlPattern();
  const parts: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    parts.push(escapeHtml(s.slice(last, m.index)));
    const fullMatch = m[0];
    const rawUrl = trimTrailingJunkFromUrl(fullMatch);
    /** Characters regex ate after the real URL (e.g. `).` in `(https://…).`) — must render after `</a>`. */
    const afterUrl = fullMatch.slice(rawUrl.length);
    try {
      const u = new URL(rawUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        parts.push(escapeHtml(fullMatch));
      } else {
        const display = rawUrl.length > 52 ? `${rawUrl.slice(0, 49)}…` : rawUrl;
        parts.push(
          `<a class="${LINK_CLASS}" href="${escapeAttr(rawUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(display)}</a>`,
        );
        if (afterUrl) parts.push(escapeHtml(afterUrl));
      }
    } catch {
      parts.push(escapeHtml(fullMatch));
    }
    last = m.index + fullMatch.length;
  }
  parts.push(escapeHtml(s.slice(last)));
  return parts.join("");
}

/** Safe subset: markdown links + bare http(s) URLs; rest HTML-escaped. */
export function inlineMarkdownLinksToHtml(s: string): string {
  if (!s) return "";

  const mdHtml: string[] = [];
  let withHoles = s.replace(mdLinkPattern(), (full, label: string, url: string) => {
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") return full;
    } catch {
      return full;
    }
    const i = mdHtml.length;
    mdHtml.push(
      `<a class="${LINK_CLASS}" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
    );
    return PH(i);
  });

  let html = linkifyBareUrlsInText(withHoles);
  for (let i = 0; i < mdHtml.length; i++) {
    html = html.replace(PH(i), mdHtml[i]!);
  }
  return html;
}
