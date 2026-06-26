import { cn } from "@/lib/utils";

const COLORS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
];

export function FacilityAvatar({
  name,
  id,
  size = "md",
}: {
  name: string;
  id: number;
  size?: "sm" | "md";
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  const color = COLORS[id % COLORS.length];
  const dim = size === "sm" ? "size-8 text-[10px]" : "size-10 text-xs";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br font-bold text-white",
        dim,
        color,
      )}
    >
      {initials}
    </span>
  );
}
