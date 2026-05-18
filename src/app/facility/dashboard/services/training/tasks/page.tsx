import { ModuleTasksPage } from "@/components/tasks/ModuleTasksPage";
import { TrainingPreSessionTasks } from "@/components/facility/training/training-pre-session-tasks";

export default function TrainingTasksPage() {
  return (
    <div className="space-y-4">
      <TrainingPreSessionTasks />
      <ModuleTasksPage moduleId="training" moduleName="Training" />
    </div>
  );
}
