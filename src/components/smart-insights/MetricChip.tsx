import type { MetricChip as MetricChipType } from "@/types/smart-insights";

export function MetricChip({ chip }: { chip: MetricChipType }) {
  return (
    <div className="bg-muted/40 inline-flex flex-col rounded-md border px-2.5 py-1 leading-tight">
      <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
        {chip.label}
      </span>
      <span className="text-[13px] font-semibold">{chip.value}</span>
    </div>
  );
}
