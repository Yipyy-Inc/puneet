import { opsInventoryItems, opsSuppliers } from "@/data/ops-inventory";
import { facilities } from "@/data/facilities";
import { InventoryClient } from "./InventoryClient";

const FACILITY_ID = 11;

export default function InventoryPage() {
  const facility = facilities.find((f) => f.id === FACILITY_ID);
  const facilityName = facility?.name ?? "Facility";

  return (
    <InventoryClient
      initialItems={opsInventoryItems}
      initialSuppliers={opsSuppliers}
      facilityId={FACILITY_ID}
      facilityName={facilityName}
    />
  );
}
