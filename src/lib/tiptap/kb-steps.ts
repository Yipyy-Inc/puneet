import { Node, mergeAttributes } from "@tiptap/core";

// Step-by-step block: an ordered container of "step" cards, each auto-numbered
// (CSS counter) with a number circle. The primary format for how-to guides.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    steps: {
      setSteps: () => ReturnType;
      /** Add a new step after the one containing the cursor. */
      addStep: () => ReturnType;
    };
  }
}

export const KbStep = Node.create({
  name: "step",
  content: "paragraph+",
  defining: true,

  parseHTML() {
    return [{ tag: "li[data-kb-step]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(HTMLAttributes, { "data-kb-step": "", class: "kb-step" }),
      0,
    ];
  },
});

export const KbSteps = Node.create({
  name: "steps",
  group: "block",
  content: "step+",

  parseHTML() {
    return [{ tag: "ol[data-kb-steps]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ol",
      mergeAttributes(HTMLAttributes, {
        "data-kb-steps": "",
        class: "kb-steps",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setSteps:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [
              { type: "step", content: [{ type: "paragraph" }] },
              { type: "step", content: [{ type: "paragraph" }] },
              { type: "step", content: [{ type: "paragraph" }] },
            ],
          }),
      addStep:
        () =>
        ({ state, chain }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth > 0; depth--) {
            if ($from.node(depth).type.name === "step") {
              return chain()
                .insertContentAt($from.after(depth), {
                  type: "step",
                  content: [{ type: "paragraph" }],
                })
                .run();
            }
          }
          return false;
        },
    };
  },
});
