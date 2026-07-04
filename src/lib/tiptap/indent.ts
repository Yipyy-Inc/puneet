import { Extension } from "@tiptap/core";

// Block indentation for the KB editor. TipTap has no built-in paragraph indent,
// so this adds an `indent` level (0..MAX) to block nodes, rendered as an inline
// margin-left, with increaseIndent / decreaseIndent commands. List nesting is
// handled separately by sink/liftListItem in the toolbar.

const MAX_INDENT = 8;
const STEP_REM = 1.5;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
    };
  }
}

export const Indent = Extension.create({
  name: "indent",

  addOptions() {
    return { types: ["paragraph", "heading", "blockquote"] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const ml = parseFloat(element.style.marginLeft || "0");
              return Number.isFinite(ml) ? Math.round(ml / STEP_REM) : 0;
            },
            renderHTML: (attributes) =>
              attributes.indent
                ? { style: `margin-left: ${attributes.indent * STEP_REM}rem` }
                : {},
          },
        },
      },
    ];
  },

  addCommands() {
    const types = this.options.types;
    const shift =
      (delta: number) =>
      ({
        tr,
        state,
        dispatch,
      }: {
        tr: import("@tiptap/pm/state").Transaction;
        state: import("@tiptap/pm/state").EditorState;
        dispatch?: (tr: import("@tiptap/pm/state").Transaction) => void;
      }) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!types.includes(node.type.name)) return;
          const current = (node.attrs.indent as number) ?? 0;
          const next = Math.max(0, Math.min(MAX_INDENT, current + delta));
          if (next !== current) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
            changed = true;
          }
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      };

    return {
      increaseIndent: () => shift(1),
      decreaseIndent: () => shift(-1),
    };
  },
});
