import Image from "@tiptap/extension-image";

// KB image: the base Image node (keeps its `src`/`alt`) plus an `align`
// attribute (left / center / right / full-width) rendered as inline layout
// styles so it displays the same anywhere the article HTML is shown.

export type KbImageAlign = "left" | "center" | "right" | "full";

const STYLE_BY_ALIGN: Record<KbImageAlign, string> = {
  left: "display:block;margin-right:auto;max-width:100%;height:auto;border-radius:6px",
  center:
    "display:block;margin-left:auto;margin-right:auto;max-width:100%;height:auto;border-radius:6px",
  right:
    "display:block;margin-left:auto;max-width:100%;height:auto;border-radius:6px",
  full: "display:block;width:100%;height:auto;border-radius:6px",
};

export const KbImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) =>
          (element.getAttribute("data-align") as KbImageAlign) || "center",
        renderHTML: (attributes) => {
          const align = (attributes.align as KbImageAlign) || "center";
          return {
            "data-align": align,
            style: STYLE_BY_ALIGN[align] ?? STYLE_BY_ALIGN.center,
          };
        },
      },
    };
  },
});
