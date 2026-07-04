import { Node, mergeAttributes } from "@tiptap/core";

// Callout box: a highlighted block with a coloured left border and a type icon.
// Serializes to self-contained HTML (inline styles + a Unicode glyph) so it
// renders identically in the editor and anywhere the article HTML is shown.

export type CalloutType = "info" | "warning" | "success" | "danger";

const META: Record<
  CalloutType,
  { symbol: string; border: string; bg: string; fg: string }
> = {
  info: { symbol: "ℹ", border: "#3b82f6", bg: "#eff6ff", fg: "#1e40af" },
  warning: { symbol: "⚠", border: "#f59e0b", bg: "#fffbeb", fg: "#92400e" },
  success: { symbol: "✓", border: "#22c55e", bg: "#f0fdf4", fg: "#166534" },
  danger: { symbol: "⛔", border: "#ef4444", bg: "#fef2f2", fg: "#991b1b" },
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type: CalloutType) => ReturnType;
      toggleCallout: (type: CalloutType) => ReturnType;
    };
  }
}

export const KbCallout = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info",
        parseHTML: (element) =>
          (element.getAttribute("data-callout") as CalloutType) || "info",
        renderHTML: (attributes) => ({ "data-callout": attributes.type }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = (node.attrs.type as CalloutType) ?? "info";
    const m = META[type] ?? META.info;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "kb-callout",
        style: `display:flex;gap:0.6rem;border-left:4px solid ${m.border};background:${m.bg};color:${m.fg};padding:0.7rem 0.9rem;border-radius:0 0.5rem 0.5rem 0;margin:0.75rem 0`,
      }),
      [
        "span",
        {
          contenteditable: "false",
          "aria-hidden": "true",
          style: `color:${m.border};font-size:1.05rem;line-height:1.6;flex-shrink:0`,
        },
        m.symbol,
      ],
      [
        "div",
        { class: "kb-callout-body", style: "flex:1 1 auto;min-width:0" },
        0,
      ],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (type) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { type }),
      toggleCallout:
        (type) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { type }),
    };
  },
});
