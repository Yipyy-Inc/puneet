import { MembershipsHero } from "./_components/MembershipsHero";
import { MembershipsTabs } from "./_components/MembershipsTabs";

export default function MembershipsPage() {
  return (
    <div className="space-y-6 pt-2">
      <MembershipsHero />
      <MembershipsTabs />
    </div>
  );
}
