"use client";

import { useState, useMemo } from "react";
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
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  BookOpen,
} from "lucide-react";
import {
  type TrainingCourseType,
  defaultTrainingCourseTypes,
  AVAILABLE_VACCINES,
} from "@/lib/training-config";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function TrainingCourseCatalogPage() {
  const [courseTypes, setCourseTypes] = useState<TrainingCourseType[]>(
    defaultTrainingCourseTypes
  );
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourseType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    defaultWeeks: 6,
    minAgeWeeks: 16,
    maxAgeWeeks: "",
    requiredVaccines: [] as string[],
    prerequisites: [] as string[],
    isActive: true,
  });

  const handleAddNew = () => {
    setEditingCourse(null);
    setFormData({
      name: "",
      description: "",
      defaultWeeks: 6,
      minAgeWeeks: 16,
      maxAgeWeeks: "",
      requiredVaccines: [],
      prerequisites: [],
      isActive: true,
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (course: TrainingCourseType) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description,
      defaultWeeks: course.defaultWeeks,
      minAgeWeeks: course.ageRange.minWeeks,
      maxAgeWeeks: course.ageRange.maxWeeks?.toString() || "",
      requiredVaccines: [...course.requiredVaccines],
      prerequisites: [...course.prerequisites],
      isActive: course.isActive,
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
    const hasDependencies = courseTypes.some(
      (course) => course.prerequisites.includes(deletingCourseId)
    );

    if (hasDependencies) {
      toast.error(
        "Cannot delete course type. Other courses depend on it as a prerequisite."
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

    const courseData: TrainingCourseType = {
      id: editingCourse?.id || `course-${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
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
      createdAt: editingCourse?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingCourse) {
      setCourseTypes(
        courseTypes.map((c) => (c.id === editingCourse.id ? courseData : c))
      );
      toast.success("Course type updated successfully");
    } else {
      setCourseTypes([...courseTypes, courseData]);
      toast.success("Course type created successfully");
    }

    setIsAddEditModalOpen(false);
    setEditingCourse(null);
  };

  // Get available courses for prerequisites (exclude self and courses that would create circular dependencies)
  const availablePrerequisites = useMemo(() => {
    if (!editingCourse) return courseTypes;
    
    return courseTypes.filter(
      (course) =>
        course.id !== editingCourse.id &&
        !course.prerequisites.includes(editingCourse.id) // Prevent circular dependencies
    );
  }, [courseTypes, editingCourse]);

  const getPrerequisiteNames = (prerequisiteIds: string[]) => {
    return prerequisiteIds
      .map((id) => courseTypes.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

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
          <Plus className="mr-2 h-4 w-4" />
          Add Course Type
        </Button>
      </div>

      {/* Course Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Course Types</CardTitle>
          <CardDescription>
            Manage your training course catalog. These are the class types you offer to clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Name</TableHead>
                <TableHead>Description</TableHead>
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No course types configured. Click "Add Course Type" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                courseTypes.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.name}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground truncate">
                        {course.description}
                      </p>
                    </TableCell>
                    <TableCell>{course.defaultWeeks} weeks</TableCell>
                    <TableCell>
                      {course.ageRange.minWeeks}+ weeks
                      {course.ageRange.maxWeeks && ` - ${course.ageRange.maxWeeks} weeks`}
                    </TableCell>
                    <TableCell>
                      {course.prerequisites.length > 0 ? (
                        <Badge variant="outline">
                          {course.prerequisites.length} required
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {course.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(course)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(course.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

            {/* Duration and Age Range */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultWeeks">
                  Default Duration (weeks) <span className="text-destructive">*</span>
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
                  Minimum Age (weeks) <span className="text-destructive">*</span>
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

            {/* Required Vaccines */}
            <div className="space-y-2">
              <Label>Required Vaccines</Label>
              <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
                {AVAILABLE_VACCINES.map((vaccine) => (
                  <div key={vaccine} className="flex items-center space-x-2">
                    <Checkbox
                      id={`vaccine-${vaccine}`}
                      checked={formData.requiredVaccines.includes(vaccine)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            requiredVaccines: [...formData.requiredVaccines, vaccine],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            requiredVaccines: formData.requiredVaccines.filter(
                              (v) => v !== vaccine
                            ),
                          });
                        }
                      }}
                    />
                    <Label
                      htmlFor={`vaccine-${vaccine}`}
                      className="text-sm font-normal cursor-pointer"
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
                <div className="flex flex-wrap gap-2 mt-2">
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
                                (id) => id !== prereqId
                              ),
                            });
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Select courses that must be completed before enrolling in this course.
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="isActive">Course Active</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive courses won't appear in client booking options
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
              Are you sure you want to delete this course type? This action cannot be undone.
              Students enrolled in this course type will be preserved, but the course will no
              longer be available for new enrollments.
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
    </div>
  );
}
