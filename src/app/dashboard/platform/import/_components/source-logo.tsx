import { getImportSource } from "@/data/import-sources";
import { cn } from "@/lib/utils";

export function SourceLogo({
  sourceId,
  size = "md",
}: {
  sourceId: string;
  size?: "sm" | "md" | "lg";
}) {
  const src = getImportSource(sourceId);
  const dim =
    size === "lg"
      ? "size-12 text-sm"
      : size === "sm"
        ? "size-7 text-[10px]"
        : "size-9 text-xs";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-linear-to-br font-bold text-white",
        dim,
        src?.gradient ?? "from-slate-500 to-slate-700",
      )}
    >
      {src?.monogram ?? "?"}
    </span>
  );
}
