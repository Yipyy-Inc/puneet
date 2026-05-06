import type { WaiverBlock } from "@/data/additional-features";

let blockIdCounter = 0;
function newBlockId() {
  blockIdCounter += 1;
  return `b-${Date.now()}-${blockIdCounter}`;
}

export const MERGE_TOKENS: { token: string; label: string }[] = [
  { token: "{{customerName}}", label: "Customer" },
  { token: "{{petName}}", label: "Pet" },
  { token: "{{facilityName}}", label: "Facility" },
  { token: "{{services}}", label: "Services" },
  { token: "{{date}}", label: "Date" },
];

/** Convert plain text into structured blocks. Recognises:
 *    `**title**` → subheading
 *    `- item` / `1. item` → bullet
 *    empty line → spacer
 *    everything else → paragraph
 */
export function blocksFromContent(content: string): WaiverBlock[] {
  const blocks: WaiverBlock[] = [];
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ id: newBlockId(), kind: "spacer", text: "" });
      continue;
    }
    if (/^\*\*(.+)\*\*$/.test(line)) {
      blocks.push({
        id: newBlockId(),
        kind: "subheading",
        text: line.replace(/^\*\*|\*\*$/g, ""),
        bold: true,
        color: "blue",
      });
      continue;
    }
    if (/^[-•]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      blocks.push({
        id: newBlockId(),
        kind: "bullet",
        text: line.replace(/^[-•]\s+|^\d+\.\s+/, ""),
      });
      continue;
    }
    blocks.push({ id: newBlockId(), kind: "paragraph", text: line });
  }
  return blocks;
}
