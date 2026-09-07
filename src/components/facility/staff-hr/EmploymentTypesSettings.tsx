"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import {
  useStaffHrConfig,
  useSaveStaffHrConfig,
} from "@/lib/api/staff-onboarding";

const humanize = (v: string) =>
  v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Facility employment types (full-time, part-time, contractor…), persisted to
 *  the Phase 0 staff-onboarding store (StaffHrConfig.employmentTypes). */
export function EmploymentTypesSettings() {
  const tx = useSettingsText().section("employment-types");
  const config = useStaffHrConfig();
  // The displayed value comes from the REFETCH this mutation triggers, not
  // from the input — see the note in src/lib/api/staff.ts.
  const { mutate: saveStaffHrConfig } = useSaveStaffHrConfig();
  const [types, setTypes] = useState<string[]>(config.employmentTypes);
  const [draft, setDraft] = useState("");

  const dirty =
    JSON.stringify(types) !== JSON.stringify(config.employmentTypes);

  const add = () => {
    const value = draft.trim().toLowerCase().replace(/\s+/g, "_");
    if (!value) return;
    if (types.includes(value)) {
      toast.error(tx("duplicate"));
      return;
    }
    setTypes((prev) => [...prev, value]);
    setDraft("");
  };

  const remove = (value: string) =>
    setTypes((prev) => prev.filter((t) => t !== value));

  const save = () => {
    saveStaffHrConfig({ employmentTypes: types });
    toast.success(tx("saved"));
  };

  return (
    <Card>
      <CardHeader>
        <p className="text-ink-tertiary mt-1 text-[14.5px]">{tx("intro")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {types.length === 0 ? (
            <p className="text-ink-tertiary text-[14.5px]">{tx("none")}</p>
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
                  <span className="sr-only">
                    {tx("removeNamed").replace("{name}", humanize(t))}
                  </span>
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder={tx("placeholder")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button variant="outline" onClick={add} className="gap-1.5">
            <Plus className="size-4" />
            {tx("add")}
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty}>
            {tx("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
