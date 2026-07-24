import GiftCardsPage from "@/app/facility/dashboard/gift-cards/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

export default function EmployeeGiftCardsPage() {
  return (
    <RequirePermission permKey="financial_manage_gift_cards">
      <GiftCardsPage />
    </RequirePermission>
  );
}
