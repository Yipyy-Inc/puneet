"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type {
  WaiverBlock,
  WaiverBlockColor,
  WaiverServiceTag,
} from "@/data/additional-features";

export interface WaiverMergeContext {
  customerName?: string;
  petName?: string;
  facilityName?: string;
  services?: WaiverServiceTag[];
  /** Locale-formatted date (defaults to today). */
  date?: string;
}

const COLOR_CLASS: Record<WaiverBlockColor, string> = {
  default: "text-slate-800",
  muted: "text-slate-500",
  red: "text-red-600",
  orange: "text-orange-600",
  amber: "text-amber-600",
  green: "text-green-600",
  blue: "text-blue-600",
  purple: "text-purple-600",
};

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g;

export function applyMergeTokens(text: string, ctx: WaiverMergeContext): string {
  const date =
    ctx.date ??
    new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const services =
    ctx.services && ctx.services.length > 0 ? ctx.services.join(", ") : "";
  const map: Record<string, string> = {
    customerName: ctx.customerName ?? "[Customer Name]",
    petName: ctx.petName ?? "[Pet Name]",
    facilityName: ctx.facilityName ?? "[Facility Name]",
    services,
    date,
  };
  return text.replace(TOKEN_PATTERN, (_, key: string) => {
    if (key in map) return map[key];
    return `{{${key}}}`;
  });
}

function renderText(text: string, ctx: WaiverMergeContext) {
  const resolved = applyMergeTokens(text, ctx);
  return resolved;
}

function blockClasses(
  block: WaiverBlock,
  base: string,
): string {
  return cn(
    base,
    block.bold && "font-semibold",
    block.italic && "italic",
    COLOR_CLASS[block.color ?? "default"],
  );
}

interface WaiverContentRendererProps {
  blocks?: WaiverBlock[];
  /** Legacy fallback when no blocks. */
  content?: string;
  context?: WaiverMergeContext;
  className?: string;
}

export function WaiverContentRenderer({
  blocks,
  content,
  context = {},
  className,
}: WaiverContentRendererProps) {
  if (blocks && blocks.length > 0) {
    return (
      <div className={cn("space-y-2.5 text-sm/relaxed", className)}>
        {groupBullets(blocks).map((group, idx) => {
          if (Array.isArray(group)) {
            return (
              <ul
                key={`ul-${idx}`}
                className="ml-5 list-disc space-y-1.5 marker:text-slate-400"
              >
                {group.map((b) => (
                  <li
                    key={b.id}
                    className={blockClasses(b, "text-sm/relaxed")}
                  >
                    {renderText(b.text, context)}
                  </li>
                ))}
              </ul>
            );
          }
          const b = group;
          if (b.kind === "heading") {
            return (
              <h3
                key={b.id}
                className={blockClasses(
                  b,
                  "mt-2 text-lg font-bold tracking-tight",
                )}
              >
                {renderText(b.text, context)}
              </h3>
            );
          }
          if (b.kind === "subheading") {
            return (
              <h4
                key={b.id}
                className={blockClasses(b, "mt-1 text-sm font-semibold")}
              >
                {renderText(b.text, context)}
              </h4>
            );
          }
          if (b.kind === "spacer") {
            return <div key={b.id} className="h-2" aria-hidden="true" />;
          }
          return (
            <p key={b.id} className={blockClasses(b, "text-sm/relaxed")}>
              {renderText(b.text, context)}
            </p>
          );
        })}
      </div>
    );
  }

  // Legacy plain-text fallback.
  if (!content) return null;
  return (
    <div className={cn("space-y-2 text-sm/relaxed text-slate-600", className)}>
      {content.split("\n").map((line, i) => (
        <Fragment key={i}>
          {line.trim() === "" ? (
            <div className="h-2" aria-hidden="true" />
          ) : (
            <p>{renderText(line, context)}</p>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function groupBullets(blocks: WaiverBlock[]): (WaiverBlock | WaiverBlock[])[] {
  const out: (WaiverBlock | WaiverBlock[])[] = [];
  let bucket: WaiverBlock[] | null = null;
  for (const b of blocks) {
    if (b.kind === "bullet") {
      if (!bucket) {
        bucket = [];
        out.push(bucket);
      }
      bucket.push(b);
    } else {
      bucket = null;
      out.push(b);
    }
  }
  return out;
}
