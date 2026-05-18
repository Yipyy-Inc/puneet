"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { GraduationCap, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentsList } from "./students-list";
import { HomeworkBoard } from "./homework-board";

type View = "students" | "homework";

const VIEW_META: Record<View, { label: string; description: string; icon: typeof GraduationCap }> = {
  students: {
    label: "Students",
    description:
      "Every pet enrolled in or having completed training at this facility.",
    icon: GraduationCap,
  },
  homework: {
    label: "Homework",
    description:
      "All active homework across every student — what they should be working on between sessions.",
    icon: NotebookPen,
  },
};

export function StudentsPageShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view: View =
    searchParams.get("view") === "homework" ? "homework" : "students";

  const setView = useCallback(
    (next: View) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "students") {
        params.delete("view");
      } else {
        params.set("view", next);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const meta = VIEW_META[view];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{meta.label}</h2>
          <p className="text-muted-foreground">{meta.description}</p>
        </div>
        <div className="inline-flex items-center rounded-full border bg-slate-50 p-1">
          {(["students", "homework"] as const).map((key) => {
            const Icon = VIEW_META[key].icon;
            const active = view === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                data-active={active || undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors",
                  "hover:text-slate-900",
                  "data-active:bg-white data-active:text-slate-900 data-active:shadow-sm",
                )}
              >
                <Icon className="size-4" />
                {VIEW_META[key].label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "students" ? <StudentsList /> : <HomeworkBoard />}
    </div>
  );
}
