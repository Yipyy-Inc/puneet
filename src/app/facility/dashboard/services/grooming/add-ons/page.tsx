import { AddOnsManager } from "@/components/facility/add-ons/AddOnsManager";

export default function GroomingAddOnsPage() {
  return (
    <div className="max-w-5xl">
      <AddOnsManager serviceFilter="grooming" />
    </div>
  );
}
