"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookmarkPlus, Calendar, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/shift-recurrence";
import { formatWeekday } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  useCreateScheduleTemplate,
  type NewTemplateShift,
} from "@/lib/api/schedule-templates";
import type { ScheduleShift, Department } from "@/types/scheduling";

// ============================================================================
// Save the shifts on screen as a weekly template.
//
// This showed "Template saved" and saved nothing — its own comment said so
// ("for the mock layer we just show a success toast"), and the Templates page
// it pointed to reads Postgres, so the template was never there. It now
// creates one through /api/schedule-templates, the same write the Templates
// page's own dialog uses, and says so only once the database has answered.
//
// A template is a WEEK: each shift becomes its weekday, and the same slot seen
// on two dates in the view is kept once. Open shifts are kept as open — the
// template route stores them, and a template that silently dropped them would
// generate a week short of cover.
// ============================================================================

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: ScheduleShift[];
  department: Department | undefined;
  dateRangeLabel: string;
}

const WEEK = [0, 1, 2, 3, 4, 5, 6];

function templateShiftsFrom(shifts: ScheduleShift[]): NewTemplateShift[] {
  const seen = new Set<string>();
  const out: NewTemplateShift[] = [];
  for (const shift of shifts) {
    const dayOfWeek = parseLocalDate(shift.date).getDay();
    const startTime = shift.startTime.slice(0, 5);
    const endTime = shift.endTime.slice(0, 5);
    const key = [
      dayOfWeek,
      shift.employeeId ?? "",
      shift.positionId,
      startTime,
      endTime,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      dayOfWeek,
      staffId: shift.employeeId ?? null,
      departmentId: shift.departmentId,
      positionId: shift.positionId,
      startTime,
      endTime,
      breakMinutes: shift.breakMinutes,
      slots: shift.slots,
      requiredSkills: shift.requiredSkills,
    });
  }
  return out;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  shifts,
  department,
  dateRangeLabel,
}: SaveAsTemplateDialogProps) {
  const { t, fill, locale } = useStaffText("saveTemplate");
  const router = useRouter();
  const create = useCreateScheduleTemplate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const templateShifts = templateShiftsFrom(shifts);
  const people = new Set(
    shifts.map((shift) => shift.employeeId).filter(Boolean),
  ).size;
  const days = new Set(templateShifts.map((shift) => shift.dayOfWeek));
  const saving = create.isPending;
  const canSave =
    Boolean(name.trim()) &&
    templateShifts.length > 0 &&
    Boolean(department) &&
    !saving;

  const handleSave = async () => {
    if (!canSave || !department) return;
    const templateName = name.trim();
    try {
      await create.mutateAsync({
        name: templateName,
        description: description.trim() || null,
        departmentId: department.id,
        shifts: templateShifts,
      });
      toast.success(fill("saved", { name: templateName }), {
        description: fill("savedBody", { count: templateShifts.length }),
        action: {
          label: t("viewTemplates"),
          onClick: () =>
            router.push("/facility/dashboard/services/scheduling/templates"),
        },
      });
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      toast.error(t("saveFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="size-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2 rounded-[16px] border p-3">
            <p className="text-muted-foreground text-xs font-bold tracking-[.06em] uppercase">
              {t("savingFrom")}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {department && (
                <span className="font-semibold">{department.name}</span>
              )}
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Calendar className="size-4" /> {dateRangeLabel}
              </span>
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs tabular-nums">
              <span className="flex items-center gap-1">
                <Clock className="size-4" />
                {fill("shiftCount", { count: templateShifts.length })}
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-4" />
                {fill("peopleCount", { count: people })}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-4" />
                {fill("dayCount", { count: days.size })}
              </span>
            </div>

            <div className="flex flex-wrap gap-1 pt-0.5">
              {WEEK.map((day) => (
                <span
                  key={day}
                  data-active={days.has(day)}
                  className="text-muted-foreground data-[active=true]:bg-primary data-[active=true]:border-primary data-[active=true]:text-primary-foreground rounded-[12px] border px-2 py-1 text-xs font-medium"
                >
                  {formatWeekday(day, locale, "short")}
                </span>
              ))}
            </div>
          </div>

          {templateShifts.length === 0 && (
            <p className="text-muted-foreground text-sm">{t("noShifts")}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="save-template-name">
              {t("nameLabel")}{" "}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </Label>
            <Input
              id="save-template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="save-template-description">
              {t("descriptionLabel")}
            </Label>
            <Textarea
              id="save-template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!canSave}
            aria-busy={saving}
          >
            <BookmarkPlus className="size-4" />
            {saving ? t("saving") : t("saveTemplate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
