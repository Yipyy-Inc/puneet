import { redirect } from "next/navigation";

// The Menu tab became Rates on 2026-09-26 (see ../rates/page.tsx). Kept so a
// bookmark or an old link lands on the page that replaced it, not on a 404.
export default function BoardingMenuPage() {
  redirect("/facility/dashboard/services/boarding/rates");
}
