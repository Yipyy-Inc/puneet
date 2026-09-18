// ============================================================================
// The one gate between an announcement's HTML and every facility's page.
//
// A platform announcement's body is HTML from the super-admin composer, and it
// is rendered with dangerouslySetInnerHTML into the facility portal's bell and
// the public status page. Only a platform admin can write one, but "only an
// admin can write it" is exactly the assumption a stolen admin session breaks:
// one <img onerror> in a body would run in every facility's browser.
//
// So this is an ALLOWLIST, and it rebuilds the markup rather than editing it:
// every tag and attribute in the output is one this file wrote. It runs on the
// server when a body is saved and again wherever one is rendered.
//
// It is a tokenizer, not a DOM — nothing here may depend on a browser, because
// the write path is a route handler, and no HTML parser is a dependency (the
// repo's rule: nothing needs installing).
//
//   kept      p br strong b em i u s ul ol li h2 h3 h4 blockquote div span
//   a         href only, and only https:, http:, mailto: or a same-site path,
//             checked AFTER entity decoding — "jav&#x61;script:" is javascript:
//   iframe    only an exact YouTube or Vimeo embed URL, nothing else
//   dropped   every other tag; every other attribute (style and on* included);
//             comments; and script/style/svg/… WITH their content
// ============================================================================

const KEPT = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "div",
  "span",
  "a",
  "iframe",
]);

const VOID = new Set(["br"]);

/** Dropped together with everything inside them. */
const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  "template",
  "noscript",
  "textarea",
  "title",
  "xmp",
  "svg",
  "math",
  "object",
  "embed",
  "select",
  "iframe",
]);

const SAFE_HREF = /^(?:https?:\/\/[^\s]+|mailto:[^\s]+|\/(?!\/)[^\s]*)$/i;

const EMBED_SRC =
  /^https:\/\/(?:www\.youtube\.com\/embed\/[A-Za-z0-9_-]{6,}|player\.vimeo\.com\/video\/\d+)$/;

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  colon: ":",
  tab: "\t",
  newline: "\n",
  nbsp: String.fromCharCode(0xa0),
};

/** Decode the entities a browser would decode inside an attribute value. */
function decodeEntities(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));?/gi,
    (whole, dec: string, hex: string, name: string) => {
      if (dec || hex) {
        const code = dec ? parseInt(dec, 10) : parseInt(hex, 16);
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
      }
      return NAMED[name.toLowerCase()] ?? whole;
    },
  );
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Text between tags: keep well-formed entities, escape everything else. */
function escapeText(text: string): string {
  return text
    .replace(/&(?!(?:#\d+|#x[0-9a-f]+|[a-z]+);)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseAttributes(raw: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const re = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const m of raw.matchAll(re)) {
    const name = m[1].toLowerCase();
    if (!attrs.has(name)) {
      attrs.set(name, decodeEntities(m[2] ?? m[3] ?? m[4] ?? ""));
    }
  }
  return attrs;
}

/** Index of the `>` that ends a tag starting at `from`, honouring quotes. */
function tagEnd(html: string, from: number): number {
  let quote: string | null = null;
  for (let i = from; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return i;
    }
  }
  return -1;
}

export function sanitizeAnnouncementHtml(input: string): string {
  const html = input ?? "";
  const out: string[] = [];
  const open: string[] = [];
  let i = 0;

  const skipPast = (name: string) => {
    const close = html.toLowerCase().indexOf(`</${name}`, i);
    if (close === -1) {
      i = html.length;
      return;
    }
    const end = tagEnd(html, close);
    i = end === -1 ? html.length : end + 1;
  };

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      out.push(escapeText(html.slice(i)));
      break;
    }
    out.push(escapeText(html.slice(i, lt)));
    i = lt;

    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }

    const head = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(i, i + 64));
    if (!head) {
      // A stray "<", a doctype, a processing instruction: text or nothing.
      if (/^<[!?]/.test(html.slice(i, i + 2))) {
        const end = tagEnd(html, i);
        i = end === -1 ? html.length : end + 1;
      } else {
        out.push("&lt;");
        i += 1;
      }
      continue;
    }

    const closing = head[1] === "/";
    const name = head[2].toLowerCase();
    const end = tagEnd(html, i + head[0].length);
    if (end === -1) {
      // An unterminated tag: nothing after it can be trusted as markup.
      break;
    }
    const rawAttrs = html.slice(i + head[0].length, end).replace(/\/\s*$/, "");
    i = end + 1;

    if (closing) {
      const at = open.lastIndexOf(name);
      if (at !== -1) {
        while (open.length > at) out.push(`</${open.pop()}>`);
      }
      continue;
    }

    if (name === "iframe") {
      const src = parseAttributes(rawAttrs).get("src") ?? "";
      skipPast("iframe");
      if (EMBED_SRC.test(src)) {
        out.push(
          `<iframe src="${escapeAttr(src)}" title="Embedded video" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`,
        );
      }
      continue;
    }

    if (DROP_WITH_CONTENT.has(name)) {
      skipPast(name);
      continue;
    }

    if (!KEPT.has(name)) continue;

    if (name === "a") {
      const href = (parseAttributes(rawAttrs).get("href") ?? "").trim();
      if (SAFE_HREF.test(href)) {
        out.push(
          `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`,
        );
      } else {
        out.push("<a>");
      }
      open.push("a");
      continue;
    }

    out.push(`<${name}>`);
    if (!VOID.has(name)) open.push(name);
  }

  while (open.length > 0) out.push(`</${open.pop()}>`);
  return out.join("");
}

/** Plain text for previews and the banner — never rendered as HTML. */
export function announcementPlainText(html: string): string {
  return decodeEntities(sanitizeAnnouncementHtml(html).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
