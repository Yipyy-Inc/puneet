"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { HomeworkTemplatesSheet } from "./_components/homework-templates-sheet";
import { RateColorPicker } from "@/components/facility/RateColorPicker";
import {
  type TrainingCourseType,
  type TrainingClassFormat,
  type CourseCurriculumWeek,
  type CurriculumStyle,
  defaultTrainingCourseTypes,
  getEffectiveCurriculumStyle,
  AVAILABLE_VACCINES,
  TRAINING_CLASS_FORMATS,
  TRAINING_CLASS_FORMAT_LABELS,
  CURRICULUM_STYLES,
  CURRICULUM_STYLE_LABELS,
} from "@/lib/training-config";
import { CourseCurriculumEditor } from "./_components/course-curriculum-editor";
import { trainingQueries } from "@/lib/api/training";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { trainingClasses as initialTrainingClasses } from "@/data/training";
import type { TrainingClass } from "@/types/training";
import {
  ApplyToUpcomingPrompt,
  type ApplyToUpcomingAffected,
  type ApplyToUpcomingChange,
} from "@/components/facility/services/apply-to-upcoming-prompt";

export default function TrainingCourseCatalogPage() {
  const [courseTypes, setCourseTypes] = useState<TrainingCourseType[]>(
    defaultTrainingCourseTypes,
  );
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourseType | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [templatesForCourse, setTemplatesForCourse] =
    useState<TrainingCourseType | null>(null);

  const [classes, setClasses] = useState<TrainingClass[]>(
    initialTrainingClasses,
  );
  const [propagationPrompt, setPropagationPrompt] = useState<{
    previous: TrainingCourseType;
    next: TrainingCourseType;
    affected: TrainingClass[];
    changes: ApplyToUpcomingChange[];
  } | null>(null);

  const { data: disciplines = [] } = useQuery(trainingQueries.disciplines());

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    whatYouWillLearn: [] as string[],
    sessionCurriculum: [] as CourseCurriculumWeek[],
    curriculumStyle: "structured" as CurriculumStyle,
    disciplineId: "",
    classFormat: "group" as TrainingClassFormat,
    defaultWeeks: 6,
    minAgeWeeks: 16,
    maxAgeWeeks: "",
    requiredVaccines: [] as string[],
    prerequisites: [] as string[],
    isActive: true,
    color: "#f97316",
  });

  const handleAddNew = () => {
    setEditingCourse(null);
    setFormData({
      name: "",
      description: "",
      whatYouWillLearn: [],
      sessionCurriculum: [],
      curriculumStyle: "structured",
      disciplineId: "",
      classFormat: "group",
      defaultWeeks: 6,
      minAgeWeeks: 16,
      maxAgeWeeks: "",
      requiredVaccines: [],
      prerequisites: [],
      isActive: true,
      color: "#f97316",
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (course: TrainingCourseType) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description,
      whatYouWillLearn: course.whatYouWillLearn
        ? [...course.whatYouWillLearn]
        : [],
      sessionCurriculum: course.sessionCurriculum
        ? course.sessionCurriculum.map((w) => ({
            ...w,
            exerciseIds: [...w.exerciseIds],
          }))
        : [],
      curriculumStyle: getEffectiveCurriculumStyle(course),
      disciplineId: course.disciplineId ?? "",
      classFormat: course.classFormat ?? "group",
      defaultWeeks: course.defaultWeeks,
      minAgeWeeks: course.ageRange.minWeeks,
      maxAgeWeeks: course.ageRange.maxWeeks?.toString() || "",
      requiredVaccines: [...course.requiredVaccines],
      prerequisites: [...course.prerequisites],
      isActive: course.isActive,
      color: course.color ?? "#f97316",
    });
    setIsAddEditModalOpen(true);
  };

  const handleDelete = (courseId: string) => {
    setDeletingCourseId(courseId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingCourseId) return;

    // Check if any other courses depend on this one
    const hasDependencies = courseTypes.some((course) =>
      course.prerequisites.includes(deletingCourseId),
    );

    if (hasDependencies) {
      toast.error(
        "Cannot delete course type. Other courses depend on it as a prerequisite.",
      );
      setIsDeleteModalOpen(false);
      setDeletingCourseId(null);
      return;
    }

    setCourseTypes(courseTypes.filter((c) => c.id !== deletingCourseId));
    toast.success("Course type deleted successfully");
    setIsDeleteModalOpen(false);
    setDeletingCourseId(null);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const learningOutcomes = formData.whatYouWillLearn
      .map((o) => o.trim())
      .filter(Boolean);

    // Adaptive courses carry no week-by-week plan — the trainer builds each
    // session from scratch — so the session plan is dropped on save.
    const isAdaptive = formData.curriculumStyle === "adaptive";

    // Clamp the curriculum to the (possibly just-reduced) duration so a course
    // never persists weeks beyond its length — the editor prunes on edit, but
    // the duration field can shrink without touching it.
    const curriculumWeeks = isAdaptive
      ? []
      : formData.sessionCurriculum.filter(
          (w) =>
            w.sessionNumber >= 1 && w.sessionNumber <= formData.defaultWeeks,
        );

    const courseData: TrainingCourseType = {
      id: editingCourse?.id || `course-${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      whatYouWillLearn:
        learningOutcomes.length > 0 ? learningOutcomes : undefined,
      sessionCurriculum:
        curriculumWeeks.length > 0 ? curriculumWeeks : undefined,
      curriculumStyle: formData.curriculumStyle,
      disciplineId: formData.disciplineId || undefined,
      classFormat: formData.classFormat,
      defaultWeeks: formData.defaultWeeks,
      ageRange: {
        minWeeks: formData.minAgeWeeks,
        maxWeeks: formData.maxAgeWeeks
          ? parseInt(formData.maxAgeWeeks)
          : undefined,
      },
      requiredVaccines: formData.requiredVaccines,
      prerequisites: formData.prerequisites,
      isActive: formData.isActive,
      color: formData.color,
      createdAt: editingCourse?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingCourse) {
      setCourseTypes(
        courseTypes.map((c) => (c.id === editingCourse.id ? courseData : c)),
      );
      toast.success("Course type updated successfully");
      detectAndPromptPropagation(editingCourse, courseData);
    } else {
      setCourseTypes([...courseTypes, courseData]);
      toast.success("Course type created successfully");
    }

    setIsAddEditModalOpen(false);
    setEditingCourse(null);
  };

  function detectAndPromptPropagation(
    previous: TrainingCourseType,
    next: TrainingCourseType,
  ) {
    const weeksChanged = previous.defaultWeeks !== next.defaultWeeks;
    const vaccinesChanged =
      JSON.stringify([...previous.requiredVaccines].sort()) !==
      JSON.stringify([...next.requiredVaccines].sort());
    const ageChanged =
      previous.ageRange.minWeeks !== next.ageRange.minWeeks ||
      previous.ageRange.maxWeeks !== next.ageRange.maxWeeks;
    if (!weeksChanged && !vaccinesChanged && !ageChanged) return;

    const today = new Date().toISOString().split("T")[0];
    const previousName = previous.name.trim().toLowerCase();
    const affected = classes.filter(
      (c) =>
        c.name.trim().toLowerCase() === previousName &&
        c.startDate >= today &&
        c.status === "active",
    );
    if (affected.length === 0) return;

    const changes: ApplyToUpcomingChange[] = [];
    if (weeksChanged) {
      changes.push({
        label: "Duration",
        from: `${previous.defaultWeeks} weeks`,
        to: `${next.defaultWeeks} weeks`,
      });
    }
    if (vaccinesChanged) {
      changes.push({
        label: "Required vaccines",
        description: next.requiredVaccines.join(", ") || "none",
      });
    }
    if (ageChanged) {
      const fmt = (r: TrainingCourseType["ageRange"]) =>
        r.maxWeeks
          ? `${r.minWeeks}-${r.maxWeeks} weeks`
          : `${r.minWeeks}+ weeks`;
      changes.push({
        label: "Age range",
        from: fmt(previous.ageRange),
        to: fmt(next.ageRange),
      });
    }

    setPropagationPrompt({ previous, next, affected, changes });
  }

  function applyPropagation() {
    if (!propagationPrompt) return;
    const { next, affected } = propagationPrompt;
    const affectedIds = new Set(affected.map((a) => a.id));
    setClasses((prev) =>
      prev.map((c) =>
        affectedIds.has(c.id) ? { ...c, totalSessions: next.defaultWeeks } : c,
      ),
    );
    toast.success(
      `Updated ${affected.length} upcoming class${
        affected.length === 1 ? "" : "es"
      } with the new course settings.`,
    );
    setPropagationPrompt(null);
  }

  function skipPropagation() {
    toast.info(
      "Change applies to new classes only — existing classes untouched.",
    );
    setPropagationPrompt(null);
  }

  // Get available courses for prerequisites (exclude self and courses that would create circular dependencies)
  const availablePrerequisites = useMemo(() => {
    if (!editingCourse) return courseTypes;

    return courseTypes.filter(
      (course) =>
        course.id !== editingCourse.id &&
        !course.prerequisites.includes(editingCourse.id), // Prevent circular dependencies
    );
  }, [courseTypes, editingCourse]);

  const disciplineById = useMemo(
    () => new Map(disciplines.map((d) => [d.id, d])),
    [disciplines],
  );

  const selectedDiscipline = formData.disciplineId
    ? disciplineById.get(formData.disciplineId)
    : undefined;

  const _getPrerequisiteNames = (prerequisiteIds: string[]) => {
    return prerequisiteIds
      .map((id) => courseTypes.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const addLearningOutcome = () =>
    setFormData({
      ...formData,
      whatYouWillLearn: [...formData.whatYouWillLearn, ""],
    });

  const updateLearningOutcome = (idx: number, value: string) =>
    setFormData({
      ...formData,
      whatYouWillLearn: formData.whatYouWillLearn.map((o, i) =>
        i === idx ? value : o,
      ),
    });

  const removeLearningOutcome = (idx: number) =>
    setFormData({
      ...formData,
      whatYouWillLearn: formData.whatYouWillLearn.filter((_, i) => i !== idx),
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Course Catalog</h2>
          <p className="text-muted-foreground">
            Configure your training course types (class definitions)
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 size-4" />
          Add Course Type
        </Button>
      </div>

      {/* Course Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Course Types</CardTitle>
          <CardDescription>
            Manage your training course catalog. These are the class types you
            offer to clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Discipline</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Age Range</TableHead>
                <TableHead>Prerequisites</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courseTypes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No course types configured. Click &quot;Add Course
                    Type&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                courseTypes.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <span
                          className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: course.color ?? "#f97316" }}
                        />
                        {course.name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-muted-foreground truncate text-sm">
                        {course.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const discipline = course.disciplineId
                          ? disciplineById.get(course.disciplineId)
                          : undefined;
                        return discipline ? (
                          <span className="inline-flex items-center gap-2 text-sm">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor: discipline.color ?? "#94a3b8",
                              }}
                            />
                            {discipline.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            None
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{course.defaultWeeks} weeks</TableCell>
                    <TableCell>
                      {course.ageRange.minWeeks}+ weeks
                      {course.ageRange.maxWeeks &&
                        ` - ${course.ageRange.maxWeeks} weeks`}
                    </TableCell>
                    <TableCell>
                      {course.prerequisites.length > 0 ? (
                        <Badge variant="outline">
                          {course.prerequisites.length} required
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          None
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {course.isActive ? (
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-700"
                        >
                          <CheckCircle2 className="mr-1 size-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 size-3" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTemplatesForCourse(course)}
                          title="Manage homework templates"
                        >
                          <BookOpen className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(course)}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(course.id)}
                        >
                          <Trash2 className="text-destructive size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? "Edit Course Type" : "Add New Course Type"}
            </DialogTitle>
            <DialogDescription>
              Configure the course type details. All fields are customizable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Course Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Course Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Basic Obedience / Beginner Manners"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what this course teaches and covers..."
                rows={4}
              />
            </div>

            {/* What You Will Learn — structured outcomes for the booking page
                and client portal catalog (complements the prose description). */}
            <div className="space-y-2">
              <Label>What You Will Learn</Label>
              <p className="text-muted-foreground text-xs">
                Bulleted skills the dog will develop. This is the key content
                shown on the online booking page and client portal catalog.
              </p>
              {formData.whatYouWillLearn.length > 0 && (
                <ul className="space-y-2">
                  {formData.whatYouWillLearn.map((outcome, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-muted-foreground shrink-0">•</span>
                      <Input
                        value={outcome}
                        onChange={(e) =>
                          updateLearningOutcome(idx, e.target.value)
                        }
                        placeholder="e.g., Reliable recall — come when called"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLearningOutcome(idx)}
                        aria-label="Remove outcome"
                      >
                        <XCircle className="text-muted-foreground size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLearningOutcome}
              >
                <Plus className="mr-1.5 size-4" />
                Add learning outcome
              </Button>
            </div>

            {/* Discipline — tags the course to a discipline so it links to the
                exercise library and the session exercise picker can suggest
                the right exercises for this course. */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="discipline">Discipline</Label>
                <a
                  href="/facility/dashboard/settings?section=training-disciplines"
                  className="text-primary text-xs hover:underline"
                >
                  Manage in Settings →
                </a>
              </div>
              <Select
                value={formData.disciplineId || "__unset__"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    disciplineId: value === "__unset__" ? "" : value,
                  })
                }
              >
                <SelectTrigger id="discipline">
                  <SelectValue placeholder="Pick a discipline…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {disciplines.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: d.color ?? "#94a3b8" }}
                        />
                        {d.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {selectedDiscipline?.description ??
                  "Connects this course to the exercise library so session logging suggests the right exercises for it."}
              </p>
            </div>

            {/* Class Format — Group / Private / Semi-Private / Drop-In.
                Controls which booking flow and calendar view this course uses. */}
            <div className="space-y-2">
              <Label htmlFor="classFormat">Class Format</Label>
              <Select
                value={formData.classFormat}
                onValueChange={(value: TrainingClassFormat) =>
                  setFormData((prev) => ({
                    ...prev,
                    classFormat: value,
                    // Private 1-on-1 courses are adaptive by default — the plan
                    // follows the individual dog (built in the student profile).
                    curriculumStyle:
                      value === "private" ? "adaptive" : prev.curriculumStyle,
                  }))
                }
              >
                <SelectTrigger id="classFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRAINING_CLASS_FORMATS.map((fmt) => (
                    <SelectItem key={fmt} value={fmt}>
                      {TRAINING_CLASS_FORMAT_LABELS[fmt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Determines which booking flow and calendar view this course type
                uses.
              </p>
            </div>

            {/* Color */}
            <RateColorPicker
              value={formData.color}
              onChange={(hex) => setFormData({ ...formData, color: hex })}
            />

            {/* Duration and Age Range */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultWeeks">
                  Default Duration (weeks){" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="defaultWeeks"
                  type="number"
                  min="1"
                  value={formData.defaultWeeks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultWeeks: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minAgeWeeks">
                  Minimum Age (weeks){" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="minAgeWeeks"
                  type="number"
                  min="0"
                  value={formData.minAgeWeeks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minAgeWeeks: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAgeWeeks">Maximum Age (weeks)</Label>
                <Input
                  id="maxAgeWeeks"
                  type="number"
                  min="0"
                  value={formData.maxAgeWeeks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxAgeWeeks: e.target.value,
                    })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Curriculum Style — Structured (fixed week-by-week plan that
                pre-loads each session) vs Adaptive (trainer builds the exercise
                list from scratch each session). */}
            <div className="space-y-2">
              <Label>Curriculum Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {CURRICULUM_STYLES.map((style) => {
                  const selected = formData.curriculumStyle === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, curriculumStyle: style })
                      }
                      data-selected={selected}
                      className="data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 data-[selected=true]:ring-primary/20 flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition data-[selected=true]:ring-2"
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        {selected && (
                          <CheckCircle2 className="text-primary size-4" />
                        )}
                        {CURRICULUM_STYLE_LABELS[style]}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {style === "structured"
                          ? "Fixed weekly plan — exercises pre-load each session."
                          : "No pre-loaded plan — trainer builds each session."}
                      </span>
                    </button>
                  );
                })}
              </div>
              {formData.classFormat === "private" && (
                <p className="text-muted-foreground text-xs">
                  Private 1-on-1 courses are Adaptive by default — build a
                  dog-specific plan inside each student&apos;s profile instead.
                </p>
              )}
            </div>

            {/* Session Plan — the per-session exercise plan. Pre-loads the
                live session's Exercises step so trainers don't start blank,
                and surfaces session goals to clients in their portal. Only
                shown for Structured courses; Adaptive courses have no plan. */}
            {formData.curriculumStyle === "structured" ? (
              <div className="space-y-2">
                <Label>Session Plan</Label>
                <p className="text-muted-foreground text-xs">
                  Define which exercises are covered in each session. Clients
                  see session goals in their portal before each class.
                </p>
                <CourseCurriculumEditor
                  weeks={formData.defaultWeeks}
                  disciplineId={formData.disciplineId || undefined}
                  value={formData.sessionCurriculum}
                  onChange={(next) =>
                    setFormData({ ...formData, sessionCurriculum: next })
                  }
                />
              </div>
            ) : (
              <div className="text-muted-foreground flex items-start gap-2.5 rounded-lg border border-dashed bg-slate-50/60 p-3 text-xs dark:bg-slate-900/40">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <p>
                  Adaptive course — no fixed session plan. The trainer opens
                  each session with an empty exercise list and builds it from
                  scratch, working on whatever each dog needs that day. They can
                  still pre-plan a single session as a one-off from the upcoming
                  session card.
                </p>
              </div>
            )}

            {/* Required Vaccines */}
            <div className="space-y-2">
              <Label>Required Vaccines</Label>
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
                {AVAILABLE_VACCINES.map((vaccine) => (
                  <div key={vaccine} className="flex items-center space-x-2">
                    <Checkbox
                      id={`vaccine-${vaccine}`}
                      checked={formData.requiredVaccines.includes(vaccine)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            requiredVaccines: [
                              ...formData.requiredVaccines,
                              vaccine,
                            ],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            requiredVaccines: formData.requiredVaccines.filter(
                              (v) => v !== vaccine,
                            ),
                          });
                        }
                      }}
                    />
                    <Label
                      htmlFor={`vaccine-${vaccine}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {vaccine}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Prerequisites */}
            <div className="space-y-2">
              <Label>Prerequisites</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !formData.prerequisites.includes(value)) {
                    setFormData({
                      ...formData,
                      prerequisites: [...formData.prerequisites, value],
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select prerequisite course..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePrerequisites.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.prerequisites.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.prerequisites.map((prereqId) => {
                    const prereq = courseTypes.find((c) => c.id === prereqId);
                    return (
                      <Badge
                        key={prereqId}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {prereq?.name || prereqId}
                        <button
                          onClick={() => {
                            setFormData({
                              ...formData,
                              prerequisites: formData.prerequisites.filter(
                                (id) => id !== prereqId,
                              ),
                            });
                          }}
                          className="hover:text-destructive ml-1"
                        >
                          <XCircle className="size-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                Select courses that must be completed before enrolling in this
                course.
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="isActive">Course Active</Label>
                <p className="text-muted-foreground text-sm">
                  Inactive courses won&apos;t appear in client booking options
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddEditModalOpen(false);
                setEditingCourse(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingCourse ? "Update Course" : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this course type? This action
              cannot be undone. Students enrolled in this course type will be
              preserved, but the course will no longer be available for new
              enrollments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingCourseId(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {propagationPrompt && (
        <ApplyToUpcomingPrompt
          open={!!propagationPrompt}
          onOpenChange={(o) => {
            if (!o) setPropagationPrompt(null);
          }}
          serviceName={propagationPrompt.next.name}
          serviceKind="course type"
          changes={propagationPrompt.changes}
          affected={propagationPrompt.affected.map<ApplyToUpcomingAffected>(
            (c) => ({
              id: c.id,
              primary: c.name,
              secondary: c.trainerName,
              date: c.startDate,
            }),
          )}
          onApply={applyPropagation}
          onSkip={skipPropagation}
          footerNote="Only classes that haven't started yet are affected. In-progress and completed classes are left untouched."
        />
      )}

      <HomeworkTemplatesSheet
        open={!!templatesForCourse}
        onOpenChange={(o) => {
          if (!o) setTemplatesForCourse(null);
        }}
        courseTypeName={templatesForCourse?.name ?? ""}
      />
    </div>
  );
}
