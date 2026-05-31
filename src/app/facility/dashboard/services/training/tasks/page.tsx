import { ModuleTasksPage } from "@/components/tasks/ModuleTasksPage";
import { TrainingTodayTasks } from "@/components/facility/training/training-today-tasks";

export default function TrainingTasksPage() {
  return (
    <div className="space-y-4">
      {/* Trainer's operational daily checklist — today's sessions with their
          Student Notes Review + Session Complete tasks. Sits above the generic
          module Task Templates / Today's Tasks (chores) tabs. */}
      <TrainingTodayTasks />
      <ModuleTasksPage moduleId="training" moduleName="Training" />
    </div>
  );
}
