import { giftCardSettings } from "@/data/gift-cards";
import { getPrimaryLocation } from "@/data/locations";
import { PublicCheckBalance } from "./_components/PublicCheckBalance";

// Single-facility mock — resolve branding for facility 11 regardless of slug.
const FACILITY_ID = 11;

interface Props {
  params: Promise<{ facilitySlug: string }>;
}

export default async function PublicCheckBalancePage({ params }: Props) {
  await params; // slug identifies the facility; mock resolves to FACILITY_ID
  const settings = giftCardSettings.find((s) => s.facilityId === FACILITY_ID);
  const brandName =
    getPrimaryLocation(FACILITY_ID)?.name.split(/[–-]/)[0].trim() ??
    "Gift Cards";

  return (
    <PublicCheckBalance
      facilityId={FACILITY_ID}
      brandName={brandName}
      logoUrl={settings?.emailBranding.logoUrl}
      primaryColor={settings?.emailBranding.primaryColor ?? "#7C3AED"}
    />
  );
}
