import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// Auto-generate stable anchor IDs on H2 and H3 headings (slugified from their
// text) so Yipyy can deep-link to specific sections of an article.

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export const HeadingAnchor = Extension.create({
  name: "headingAnchor",

  addGlobalAttributes() {
    return [
      {
        types: ["heading"],
        attributes: {
          id: {
            default: null,
            parseHTML: (element) => element.getAttribute("id"),
            renderHTML: (attributes) =>
              attributes.id ? { id: attributes.id } : {},
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("headingAnchor"),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          let tr = newState.tr;
          let modified = false;
          const seen = new Map<string, number>();

          newState.doc.descendants((node, pos) => {
            if (
              node.type.name !== "heading" ||
              (node.attrs.level !== 2 && node.attrs.level !== 3)
            ) {
              return;
            }
            const base = slugify(node.textContent);
            if (!base) return;
            // De-duplicate repeated heading text within the same article.
            const count = seen.get(base) ?? 0;
            seen.set(base, count + 1);
            const desired = count === 0 ? base : `${base}-${count}`;
            if (node.attrs.id !== desired) {
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                id: desired,
              });
              modified = true;
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
