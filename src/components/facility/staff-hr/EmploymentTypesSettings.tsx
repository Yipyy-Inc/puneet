"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStaffHrConfig, saveStaffHrConfig } from "@/data/staff-onboarding";

const humanize = (v: string) =>
  v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Facility employment types (full-time, part-time, contractor…), persisted to
 *  the Phase 0 staff-onboarding store (StaffHrConfig.employmentTypes). */
export function EmploymentTypesSettings() {
  const config = useStaffHrConfig();
  const [types, setTypes] = useState<string[]>(config.employmentTypes);
  const [draft, setDraft] = useState("");

  const dirty =
    JSON.stringify(types) !== JSON.stringify(config.employmentTypes);

  const add = () => {
    const value = draft.trim().toLowerCase().replace(/\s+/g, "_");
    if (!value) return;
    if (types.includes(value)) {
      toast.error("That employment type already exists");
      return;
    }
    setTypes((prev) => [...prev, value]);
    setDraft("");
  };

  const remove = (value: string) =>
    setTypes((prev) => prev.filter((t) => t !== value));

  const save = () => {
    saveStaffHrConfig({ employmentTypes: types });
    toast.success("Employment types saved");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Briefcase className="text-muted-foreground size-5" />
          <CardTitle>Employment Types</CardTitle>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          The employment types available when hiring or editing a staff member.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {types.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No employment types yet — add one below.
            </p>
          ) : (
            types.map((t) => (
              <div
                key={t}
                className="bg-muted/40 flex items-center justify-between rounded-md px-3 py-2"
              >
                <span className="text-sm font-medium">{humanize(t)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => remove(t)}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Remove {humanize(t)}</span>
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder="e.g. Per diem"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button variant="outline" onClick={add} className="gap-1.5">
            <Plus className="size-4" />
            Add
          </Button>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={!dirty}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
