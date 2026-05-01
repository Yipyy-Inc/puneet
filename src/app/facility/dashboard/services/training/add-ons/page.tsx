import { AddOnsManager } from "@/components/facility/add-ons/AddOnsManager";

export default function TrainingAddOnsPage() {
  return (
    <div className="max-w-5xl">
      <AddOnsManager serviceFilter="training" />
    </div>
  );
}
