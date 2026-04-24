"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Droplets,
  Trash2,
  BedDouble,
  Stethoscope,
  Thermometer,
  AlertOctagon,
  Settings,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import type {
  CareModulesConfig,
  CareModuleType,
  BehaviorIncident,
  ScheduledTask,
  TaskExecution,
  ShiftType,
} from "./guest-journal";
import { OUTCOME_LABELS } from "./task-rows";
import type { BoardingGuest } from "@/data/boarding";

// ── Module config ─────────────────────────────────────────────────────────────

type ModuleDef = {
  key: keyof CareModulesConfig;
  label: string;
  description: string;
  Icon: React.ElementType;
  iconColor: string;
  subType?: CareModuleType;
};

const MODULE_DEFS: ModuleDef[] = [
  {
    key: "waterRefill",
    label: "Water Refill",
    description: "Track 3× daily bowl refills for every guest",
    Icon: Droplets,
    iconColor: "text-cyan-600",
    subType: "water_refill",
  },
  {
    key: "crateCleaning",
    label: "Crate Cleaning",
    description: "Morning kennel clean + spot checks logged by staff",
    Icon: Trash2,
    iconColor: "text-slate-600",
    subType: "crate_clean",
  },
  {
    key: "beddingChange",
    label: "Bedding Change",
    description: "Daily bedding swap with soiled / clean tracking",
    Icon: BedDouble,
    iconColor: "text-indigo-600",
    subType: "bedding_change",
  },
  {
    key: "postSurgeryMonitoring",
    label: "Post-Surgery Monitoring",
    description: "Scheduled checks for guests recovering from surgery",
    Icon: Stethoscope,
    iconColor: "text-red-600",
    subType: "monitoring",
  },
  {
    key: "heatCycleTracking",
    label: "Heat Cycle Tracking",
    description: "Twice-daily observations for intact females in heat",
    Icon: Thermometer,
    iconColor: "text-pink-600",
    subType: "heat_tracking",
  },
  {
    key: "behaviorIncidents",
    label: "Behavior Incidents",
    description: "Ad-hoc incident reports — growling, snapping, aggression",
    Icon: AlertOctagon,
    iconColor: "text-amber-600",
  },
];

// ── Settings panel ────────────────────────────────────────────────────────────

function SettingsPanel({
  config,
  onToggle,
}: {
  config: CareModulesConfig;
  onToggle: (key: keyof CareModulesConfig) => void;
}) {
  return (
    <div className="space-y-2 py-1">
      {MODULE_DEFS.map(({ key, label, description, Icon, iconColor }) => (
        <div
          key={key}
          className="flex items-center gap-3 rounded-xl border p-3"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Icon className={`size-4 ${iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-muted-foreground text-xs">{description}</p>
          </div>
          <button
            onClick={() => onToggle(key)}
            data-on={config[key]}
            className="flex size-12 shrink-0 cursor-pointer items-center rounded-full border-2 p-1 transition-all data-[on=true]:border-primary data-[on=true]:bg-primary data-[on=false]:border-border data-[on=false]:bg-muted"
          >
            <span
              data-on={config[key]}
              className="size-4 rounded-full transition-all data-[on=true]:translate-x-5 data-[on=true]:bg-white data-[on=false]:translate-x-0 data-[on=false]:bg-muted-foreground/40"
            />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Behavior Incident Modal ───────────────────────────────────────────────────

const INCIDENT_TYPES = [
  { value: "growling",             label: "Growling" },
  { value: "snapping",             label: "Snapping" },
  { value: "bite",                 label: "Bite / Near-Bite" },
  { value: "dog_aggression",       label: "Aggression Toward Dog" },
  { value: "destruction",          label: "Destruction / Property Damage" },
  { value: "self_harm",            label: "Self-Harm / Excessive Scratching" },
  { value: "excessive_anxiety",    label: "Excessive Anxiety / Panic" },
  { value: "escape_attempt",       label: "Escape Attempt" },
  { value: "resource_guarding",    label: "Resource Guarding" },
  { value: "other",                label: "Other" },
];

const SEVERITY_OPTIONS = [
  { value: "low",      label: "Low — monitored",     color: "text-blue-600" },
  { value: "medium",   label: "Medium — flagged",     color: "text-amber-600" },
  { value: "high",     label: "High — owner notified", color: "text-orange-600" },
  { value: "critical", label: "Critical — vet/911",   color: "text-red-600" },
] as const;

function BehaviorIncidentModal({
  guests,
  open,
  onClose,
  onSubmit,
}: {
  guests: BoardingGuest[];
  open: boolean;
  onClose: () => void;
  onSubmit: (incident: Omit<BehaviorIncident, "id">) => void;
}) {
  const [guestId, setGuestId] = useState(guests[0]?.id ?? "");
  const [incidentType, setIncidentType] = useState("");
  const [severity, setSeverity] = useState<BehaviorIncident["severity"] | "">("");
  const [description, setDescription] = useState("");
  const [staffInitials, setStaffInitials] = useState("");

  const canSubmit = guestId && incidentType && severity && description && staffInitials;
  const guest = guests.find((g) => g.id === guestId);

  const handleSubmit = () => {
    if (!canSubmit || !guest) return;
    const now = new Date().toTimeString().slice(0, 5);
    onSubmit({
      guestId,
      petName: guest.petName,
      kennelName: guest.kennelName,
      reportedAt: now,
      staffInitials,
      incidentType,
      severity: severity as BehaviorIncident["severity"],
      description,
    });
    setGuestId(guests[0]?.id ?? "");
    setIncidentType("");
    setSeverity("");
    setDescription("");
    setStaffInitials("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertOctagon className="size-5 text-amber-500" />
            Report Behavior Incident
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Guest</Label>
            <Select value={guestId} onValueChange={setGuestId}>
              <SelectTrigger>
                <SelectValue placeholder="Select guest..." />
              </SelectTrigger>
              <SelectContent>
                {guests.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.petName} — {g.kennelName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Incident Type</Label>
            <Select value={incidentType} onValueChange={setIncidentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Severity</Label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSeverity(opt.value)}
                  data-selected={severity === opt.value}
                  className="cursor-pointer rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-all data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 data-[selected=false]:border-border data-[selected=false]:hover:bg-muted/50"
                >
                  <span className={`font-semibold ${opt.color}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe exactly what happened, context, and any immediate actions taken..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Staff Initials</Label>
            <Input
              value={staffInitials}
              onChange={(e) => setStaffInitials(e.target.value.toUpperCase())}
              placeholder="e.g. SJ"
              maxLength={3}
              className="uppercase"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            <AlertOctagon className="mr-2 size-4" />
            File Incident Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Care module section ───────────────────────────────────────────────────────

function CareSection({
  title,
  Icon,
  iconColor,
  tasks,
  executions,
  onLogTask,
  getExecForTask,
}: {
  title: string;
  Icon: React.ElementType;
  iconColor: string;
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  onLogTask: (task: ScheduledTask) => void;
  getExecForTask: (taskId: string) => TaskExecution | undefined;
}) {
  const done = tasks.filter((t) => !!getExecForTask(t.id)).length;
  const isAllDone = done === tasks.length && tasks.length > 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`size-4 ${iconColor}`} />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <Badge variant={isAllDone ? "default" : "secondary"} className={isAllDone ? "bg-green-500" : ""}>
          {done}/{tasks.length}
        </Badge>
      </div>
      <div className="space-y-1.5">
        {tasks.map((task) => {
          const exec = getExecForTask(task.id);
          const outcomeInfo = exec ? OUTCOME_LABELS[exec.outcome] : null;
          const isConcern = exec && ["accident_found", "concern_flagged", "emergency", "heavy_discharge", "behavioral_change"].includes(exec.outcome);
          return (
            <div
              key={task.id}
              data-done={!!exec && !isConcern}
              data-concern={!!isConcern}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors data-[concern=true]:border-red-300 data-[concern=true]:bg-red-50/60 data-[done=true]:border-green-200 data-[done=true]:bg-green-50/40 dark:data-[concern=true]:border-red-700 dark:data-[concern=true]:bg-red-900/10 dark:data-[done=true]:border-green-800 dark:data-[done=true]:bg-green-900/10"
            >
              <span className="flex-1 font-medium">{task.petName}</span>
              <span className="text-muted-foreground text-xs">{task.kennelName}</span>
              {exec ? (
                <div className="flex items-center gap-1">
                  {isConcern ? (
                    <AlertTriangle className="size-3.5 text-red-500" />
                  ) : (
                    <CheckCircle className="size-3.5 text-green-500" />
                  )}
                  <span className={`text-xs font-medium ${outcomeInfo?.colorClass ?? ""}`}>
                    {outcomeInfo?.label}
                  </span>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onLogTask(task)}>
                  Log
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CareModulesPanel ──────────────────────────────────────────────────────────

type Props = {
  config: CareModulesConfig;
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  activeShift: ShiftType;
  guests: BoardingGuest[];
  behaviorIncidents: BehaviorIncident[];
  onToggleModule: (module: keyof CareModulesConfig) => void;
  onLogTask: (task: ScheduledTask) => void;
  onReportIncident: (incident: Omit<BehaviorIncident, "id">) => void;
  getExecForTask: (taskId: string) => TaskExecution | undefined;
};

export function CareModulesPanel({
  config,
  tasks,
  executions,
  activeShift,
  guests,
  behaviorIncidents,
  onToggleModule,
  onLogTask,
  onReportIncident,
  getExecForTask,
}: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);

  const anyEnabled = Object.values(config).some(Boolean);
  const shiftCareTasks = tasks.filter(
    (t) => t.taskType === "care" && t.shift === activeShift,
  );

  const careTasksForSubType = (subType: CareModuleType) =>
    shiftCareTasks.filter((t) => t.subType === subType);

  const totalCare = shiftCareTasks.length;
  const doneCare = shiftCareTasks.filter((t) => !!getExecForTask(t.id)).length;

  if (!anyEnabled) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <button
              onClick={() => setShowPanel((v) => !v)}
              className="flex cursor-pointer items-center gap-2"
            >
              <Stethoscope className="text-primary size-4" />
              <span>Care Rounds</span>
              {showPanel ? (
                <ChevronUp className="text-muted-foreground size-4" />
              ) : (
                <ChevronDown className="text-muted-foreground size-4" />
              )}
            </button>
            <div className="flex items-center gap-2">
              {totalCare > 0 && (
                <Badge
                  variant={doneCare === totalCare ? "default" : "secondary"}
                  className={doneCare === totalCare ? "bg-green-500" : ""}
                >
                  {doneCare}/{totalCare}
                </Badge>
              )}
              <button
                onClick={() => setShowSettings((v) => !v)}
                data-active={showSettings}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg border transition-colors data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=false]:hover:bg-muted"
              >
                <Settings className="size-4" />
              </button>
            </div>
          </CardTitle>
        </CardHeader>

        {showSettings && (
          <CardContent className="border-t pt-4">
            <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
              Enable / Disable Modules
            </p>
            <SettingsPanel config={config} onToggle={onToggleModule} />
          </CardContent>
        )}

        {showPanel && !showSettings && (
          <CardContent className="space-y-5 pt-0">
            {config.waterRefill && careTasksForSubType("water_refill").length > 0 && (
              <CareSection
                title="Water Refills"
                Icon={Droplets}
                iconColor="text-cyan-600"
                tasks={careTasksForSubType("water_refill")}
                executions={executions}
                onLogTask={onLogTask}
                getExecForTask={getExecForTask}
              />
            )}
            {config.crateCleaning && careTasksForSubType("crate_clean").length > 0 && (
              <CareSection
                title="Crate Cleaning"
                Icon={Trash2}
                iconColor="text-slate-600"
                tasks={careTasksForSubType("crate_clean")}
                executions={executions}
                onLogTask={onLogTask}
                getExecForTask={getExecForTask}
              />
            )}
            {config.beddingChange && careTasksForSubType("bedding_change").length > 0 && (
              <CareSection
                title="Bedding Change"
                Icon={BedDouble}
                iconColor="text-indigo-600"
                tasks={careTasksForSubType("bedding_change")}
                executions={executions}
                onLogTask={onLogTask}
                getExecForTask={getExecForTask}
              />
            )}
            {config.postSurgeryMonitoring && careTasksForSubType("monitoring").length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Stethoscope className="size-4 text-red-600" />
                  <span className="text-sm font-semibold">Post-Surgery Monitoring</span>
                  <Badge variant="destructive" className="text-xs">Critical</Badge>
                </div>
                <div className="space-y-1.5">
                  {careTasksForSubType("monitoring").map((task) => {
                    const exec = getExecForTask(task.id);
                    const outcomeInfo = exec ? OUTCOME_LABELS[exec.outcome] : null;
                    const isEmergency = exec?.outcome === "emergency";
                    return (
                      <div
                        key={task.id}
                        data-done={!!exec && !isEmergency}
                        data-emergency={isEmergency}
                        className="flex items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors data-[done=true]:border-green-200 data-[done=true]:bg-green-50/40 data-[emergency=true]:border-red-400 data-[emergency=true]:bg-red-50/80 dark:data-[done=true]:border-green-800 dark:data-[done=true]:bg-green-900/10 dark:data-[emergency=true]:bg-red-900/20"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{task.petName}</span>
                            <span className="text-muted-foreground text-xs">{task.scheduledTime}</span>
                          </div>
                          {task.subDetails?.[0] && (
                            <p className="text-muted-foreground text-xs">{task.subDetails[0]}</p>
                          )}
                        </div>
                        {exec ? (
                          <div className="flex items-center gap-1">
                            {isEmergency ? (
                              <AlertTriangle className="size-3.5 text-red-500" />
                            ) : (
                              <CheckCircle className="size-3.5 text-green-500" />
                            )}
                            <span className={`text-xs font-medium ${outcomeInfo?.colorClass ?? ""}`}>
                              {outcomeInfo?.label}
                            </span>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onLogTask(task)}>
                            Check
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {config.heatCycleTracking && careTasksForSubType("heat_tracking").length > 0 && (
              <CareSection
                title="Heat Cycle Tracking"
                Icon={Thermometer}
                iconColor="text-pink-600"
                tasks={careTasksForSubType("heat_tracking")}
                executions={executions}
                onLogTask={onLogTask}
                getExecForTask={getExecForTask}
              />
            )}
            {config.behaviorIncidents && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="size-4 text-amber-600" />
                    <span className="text-sm font-semibold">Behavior Incidents</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setIncidentModalOpen(true)}>
                    <AlertOctagon className="mr-1.5 size-3.5 text-amber-600" />
                    Report Incident
                  </Button>
                </div>
                {behaviorIncidents.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-sm">
                    No incidents reported this session
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {behaviorIncidents.map((inc) => (
                      <div
                        key={inc.id}
                        data-critical={inc.severity === "critical" || inc.severity === "high"}
                        className="flex items-start gap-2 rounded-lg border px-3 py-2.5 data-[critical=true]:border-red-300 data-[critical=true]:bg-red-50/60 data-[critical=false]:border-amber-200 data-[critical=false]:bg-amber-50/40 dark:data-[critical=true]:bg-red-900/10 dark:data-[critical=false]:bg-amber-900/10"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{inc.petName}</span>
                            <span className="text-muted-foreground text-xs">{inc.reportedAt}</span>
                            <span className="text-muted-foreground text-xs">· {inc.staffInitials}</span>
                          </div>
                          <p className="text-sm mt-0.5 truncate">{inc.description}</p>
                        </div>
                        <Badge
                          variant="outline"
                          data-critical={inc.severity === "critical"}
                          className="shrink-0 text-xs data-[critical=true]:border-red-400 data-[critical=true]:text-red-700"
                        >
                          {inc.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <BehaviorIncidentModal
        guests={guests}
        open={incidentModalOpen}
        onClose={() => setIncidentModalOpen(false)}
        onSubmit={onReportIncident}
      />
    </>
  );
}
