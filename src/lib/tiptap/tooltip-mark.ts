import { Mark, mergeAttributes } from "@tiptap/core";

// Inline "definition" tooltip for technical terms. Wraps the selection in an
// <abbr title="…"> so the browser shows the explanation on hover; styled with a
// dotted underline via the .kb-tooltip class.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tooltip: {
      setTooltip: (definition: string) => ReturnType;
      unsetTooltip: () => ReturnType;
    };
  }
}

export const Tooltip = Mark.create({
  name: "tooltip",

  addAttributes() {
    return {
      definition: {
        default: "",
        parseHTML: (element) => element.getAttribute("title") ?? "",
        renderHTML: (attributes) => ({ title: attributes.definition }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "abbr[data-tooltip]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "abbr",
      mergeAttributes(HTMLAttributes, {
        "data-tooltip": "",
        class: "kb-tooltip",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setTooltip:
        (definition) =>
        ({ commands }) =>
          commands.setMark(this.name, { definition }),
      unsetTooltip:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
