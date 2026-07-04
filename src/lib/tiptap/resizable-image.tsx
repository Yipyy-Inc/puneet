"use client";

import { useRef, useState } from "react";
import Image from "@tiptap/extension-image";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";

// Image node with inline drag-to-resize handles. Used for logos, signature
// blocks and illustrative diagrams. Built on TipTap's Image extension with a
// React NodeView rather than a third-party package so it stays compatible with
// React 19 / the React Compiler. Width persists as an attribute on the node, so
// it round-trips through the saved HTML.

function ResizableImageView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);

  const width = node.attrs.width as number | null;
  const align = (node.attrs.align as string | null) ?? "left";

  const startResize = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = imgRef.current?.offsetWidth ?? 0;
    setDragging(true);

    const onMove = (moveEvent: PointerEvent) => {
      const next = Math.max(48, startWidth + (moveEvent.clientX - startX));
      updateAttributes({ width: Math.round(next) });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <NodeViewWrapper
      as="span"
      style={{
        display: "block",
        position: "relative",
        lineHeight: 0,
        textAlign: align as React.CSSProperties["textAlign"],
      }}
    >
      <span
        style={{ position: "relative", display: "inline-block" }}
        data-selected={selected || undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={node.attrs.src as string}
          alt={(node.attrs.alt as string | null) ?? ""}
          draggable={false}
          data-drag-handle
          style={{
            width: width ? `${width}px` : "auto",
            maxWidth: "100%",
            height: "auto",
            display: "inline-block",
            borderRadius: 4,
            outline: selected
              ? "2px solid var(--color-primary, #6366f1)"
              : "none",
          }}
        />
        {selected ? (
          <span
            onPointerDown={startResize}
            role="presentation"
            aria-label="Resize image"
            data-dragging={dragging || undefined}
            style={{
              position: "absolute",
              right: -6,
              bottom: -6,
              width: 14,
              height: 14,
              borderRadius: 3,
              border: "2px solid var(--color-primary, #6366f1)",
              background: "#fff",
              cursor: "nwse-resize",
            }}
          />
        ) : null}
      </span>
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("width");
          return value ? parseInt(value, 10) : null;
        },
        renderHTML: (attributes) =>
          attributes.width ? { width: attributes.width } : {},
      },
      align: {
        default: "left",
        parseHTML: (element) =>
          (element as HTMLElement).style.textAlign || "left",
        renderHTML: (attributes) =>
          attributes.align && attributes.align !== "left"
            ? { style: `text-align: ${attributes.align}` }
            : {},
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
