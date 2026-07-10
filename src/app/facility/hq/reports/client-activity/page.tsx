import { redirect } from "next/navigation";

// Cross-Location Client Activity was moved to the Clients HQ page.
export default function ClientActivityPage() {
  redirect("/facility/hq/clients");
}
