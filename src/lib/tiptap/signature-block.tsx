"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { PenLine, X } from "lucide-react";

// Block-level signature node. A document may contain MANY of these (e.g. one for
// the facility owner and one for a Yipyy representative). Each is a distinct,
// removable atom carrying a stable `id` and a `signerRole`, so the signing
// portal (Task 6) can render one input group per block and post signatures back
// keyed by id. The name field is a merge token, auto-filled at send time; the
// signature and date are captured at signing time.

export type SignerRole = "Facility Owner" | "Yipyy Representative";

const NAME_TOKEN: Record<string, string> = {
  "Facility Owner": "owner_name",
  "Yipyy Representative": "yipyy_rep_name",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    signatureBlock: {
      insertSignatureBlock: (attrs: {
        id: string;
        signerRole: SignerRole;
      }) => ReturnType;
    };
  }
}

function SignatureField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
        {label}
      </span>
      {value ? (
        <span className="w-fit rounded-sm bg-indigo-50 px-1.5 py-0.5 text-sm font-medium text-indigo-700">
          {value}
        </span>
      ) : (
        <span className="h-8 border-b border-zinc-400" />
      )}
    </div>
  );
}

function SignatureBlockView({ node, deleteNode, editor }: NodeViewProps) {
  const signerRole = (node.attrs.signerRole as string) ?? "Facility Owner";
  const nameToken = NAME_TOKEN[signerRole] ?? "owner_name";

  return (
    <NodeViewWrapper
      as="div"
      data-signature-block=""
      data-signature-id={node.attrs.id as string}
      contentEditable={false}
      className="relative my-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/70 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
          <PenLine className="size-3.5" />
          {signerRole} — Signature Block
        </span>
        {editor.isEditable ? (
          <button
            type="button"
            onClick={() => deleteNode()}
            aria-label="Remove signature block"
            className="flex size-6 items-center justify-center rounded-sm text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SignatureField label="Name" value={`{{${nameToken}}}`} />
        <SignatureField label="Title" />
        <SignatureField label="Signature" />
        <SignatureField label="Date Signed" />
      </div>
    </NodeViewWrapper>
  );
}

export const SignatureBlock = Node.create({
  name: "signatureBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-signature-id"),
        renderHTML: (attributes) =>
          attributes.id ? { "data-signature-id": attributes.id } : {},
      },
      signerRole: {
        default: "Facility Owner",
        parseHTML: (element) =>
          element.getAttribute("data-signer-role") ?? "Facility Owner",
        renderHTML: (attributes) => ({
          "data-signer-role": attributes.signerRole,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-signature-block]" }];
  },

  // Static serialization used by getHTML() / previews / the sent document. The
  // interactive editor uses the NodeView above; this keeps the saved HTML
  // self-describing and carries the id + role for the Task 6 signing portal.
  renderHTML({ node, HTMLAttributes }) {
    const signerRole = (node.attrs.signerRole as string) ?? "Facility Owner";
    const nameToken = NAME_TOKEN[signerRole] ?? "owner_name";
    const field = (label: string, inner: unknown) => [
      "div",
      { class: "sig-field" },
      ["span", { class: "sig-label" }, label],
      inner,
    ];

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-signature-block": "",
        class: "agreement-signature-block",
      }),
      ["div", { class: "sig-role" }, `${signerRole} — Signature Block`],
      [
        "div",
        { class: "sig-grid" },
        field("Name", [
          "span",
          { class: "agreement-merge-field", "data-merge-field": nameToken },
          `{{${nameToken}}}`,
        ]),
        field("Title", ["span", { class: "sig-line" }, ""]),
        field("Signature", ["span", { class: "sig-line" }, ""]),
        field("Date Signed", ["span", { class: "sig-line" }, ""]),
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SignatureBlockView);
  },

  addCommands() {
    return {
      insertSignatureBlock:
        (attrs) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs }).run(),
    };
  },
});
