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

/** Termination / departure reasons — an editable list of labels, persisted to
 *  the Phase 0 store (StaffHrConfig.terminationReasons). Feeds the reason
 *  dropdown in the staff status-change dialog. */
export function TerminationReasonsSettings() {
  const tx = useSettingsText().section("termination-reasons");
  const config = useStaffHrConfig();
  // The displayed value comes from the REFETCH this mutation triggers, not
  // from the input — see the note in src/lib/api/staff.ts.
  const { mutate: saveStaffHrConfig } = useSaveStaffHrConfig();
  const [reasons, setReasons] = useState<string[]>(config.terminationReasons);
  const [draft, setDraft] = useState("");

  const dirty =
    JSON.stringify(reasons) !== JSON.stringify(config.terminationReasons);

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (reasons.some((r) => r.toLowerCase() === value.toLowerCase())) {
      toast.error(tx("duplicate"));
      return;
    }
    setReasons((prev) => [...prev, value]);
    setDraft("");
  };

  const rename = (i: number, value: string) =>
    setReasons((prev) => prev.map((r, j) => (j === i ? value : r)));

  const remove = (i: number) =>
    setReasons((prev) => prev.filter((_, j) => j !== i));

  const save = () => {
    const cleaned = reasons.map((r) => r.trim()).filter(Boolean);
    saveStaffHrConfig({ terminationReasons: cleaned });
    setReasons(cleaned);
    toast.success(tx("saved"));
  };

  return (
    <Card>
      <CardHeader>
        <p className="text-ink-tertiary mt-1 text-[14.5px]">{tx("intro")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {reasons.length === 0 ? (
            <p className="text-ink-tertiary text-[14.5px]">{tx("none")}</p>
          ) : (
            reasons.map((reason, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={reason}
                  className="h-9"
                  onChange={(e) => rename(i, e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Remove {reason}</span>
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
