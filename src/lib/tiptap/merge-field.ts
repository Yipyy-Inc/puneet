import { Node, mergeAttributes } from "@tiptap/core";

// Inline "merge field" node — a dynamic token such as {{facility_name}} that is
// filled with a specific facility's data when the agreement is sent (Task 5+).
// It is an atom (a single, non-editable, selectable/removable unit) and
// serializes as <span data-merge-field="token">{{token}}</span> so the send-time
// substitution can find and replace every token by its data attribute.

export interface MergeFieldToken {
  token: string;
  label: string;
}

/** The tokens offered in the toolbar. Mirrors the Email Templates field set. */
export const MERGE_FIELDS: MergeFieldToken[] = [
  { token: "facility_name", label: "Facility Name" },
  { token: "owner_name", label: "Owner Name" },
  { token: "plan_name", label: "Plan Name" },
  { token: "date", label: "Date" },
  { token: "subscription_start_date", label: "Subscription Start Date" },
  { token: "monthly_amount", label: "Monthly Amount" },
];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mergeField: {
      insertMergeField: (token: string) => ReturnType;
    };
  }
}

export const MergeField = Node.create({
  name: "mergeField",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      token: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-merge-field") ?? "",
        renderHTML: (attributes) => ({
          "data-merge-field": attributes.token,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-merge-field]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "agreement-merge-field" }),
      `{{${node.attrs.token}}}`,
    ];
  },

  renderText({ node }) {
    return `{{${node.attrs.token}}}`;
  },

  addCommands() {
    return {
      insertMergeField:
        (token) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs: { token } }).run(),
    };
  },
});
