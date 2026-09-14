import { redirect } from "next/navigation";

// Grooming supplies are the facility's retail stock. This page was 1,700 lines
// over `groomingProducts` and `inventoryOrders` in src/data — shampoo nobody
// bought and orders nobody placed, identical at every facility — while the
// real products, stock counts and purchase orders live under Retail. A saved
// link lands there.
export default function GroomingInventoryPage() {
  redirect("/facility/dashboard/services/retail/inventory");
}
