import { AddOnsManager } from "@/components/facility/add-ons/AddOnsManager";

export default function BoardingAddOnsPage() {
  return (
    <div className="max-w-5xl">
      <AddOnsManager serviceFilter="boarding" />
    </div>
  );
}
