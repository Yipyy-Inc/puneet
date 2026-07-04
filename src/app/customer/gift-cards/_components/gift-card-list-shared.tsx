import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GiftCard } from "@/types/payments";

export const STATUS_META: Record<
  GiftCard["status"],
  { label: string; className: string }
> = {
  active: { label: "Active", className: "bg-green-500 text-white" },
  redeemed: { label: "Fully Redeemed", className: "bg-blue-500 text-white" },
  expired: { label: "Expired", className: "bg-red-500 text-white" },
  cancelled: { label: "Voided", className: "bg-gray-500 text-white" },
};

// Cards carry no design field yet, so derive a stable thumbnail gradient by id.
const THUMB_GRADIENTS = [
  "from-pink-400 to-rose-500",
  "from-violet-500 to-purple-600",
  "from-sky-400 to-blue-600",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-600",
  "from-fuchsia-500 to-pink-600",
];
const thumbGradient = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h + ch.charCodeAt(0)) % THUMB_GRADIENTS.length;
  return THUMB_GRADIENTS[h];
};

export const fmtDate = (s?: string) =>
  s
    ? new Date(s).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export function Thumb({ id }: { id: string }) {
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm",
        thumbGradient(id),
      )}
    >
      <Gift className="size-5" />
    </div>
  );
}

export function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-sm">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        {icon}
      </div>
      {text}
    </div>
  );
}
