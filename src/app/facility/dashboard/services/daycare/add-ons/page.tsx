import { AddOnsManager } from "@/components/facility/add-ons/AddOnsManager";

export default function DaycareAddOnsPage() {
  return (
    <div className="max-w-5xl">
      <AddOnsManager serviceFilter="daycare" />
    </div>
  );
}
