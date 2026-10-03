import { cn } from "@/lib/utils";

// One block of the report card: a white panel on the card's ground, its
// label in the theme's ink (every theme is a text-safe ink, §1).
export function CardSection({
  title,
  ink,
  children,
}: {
  title: string;
  /** The theme's text class, e.g. `text-success`. */
  ink: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card flex flex-col gap-2 rounded-[16px] px-3.5 py-3">
      <h4
        className={cn(
          "text-[10.5px] font-extrabold tracking-widest uppercase",
          ink,
        )}
      >
        {title}
      </h4>
      {children}
    </section>
  );
}
