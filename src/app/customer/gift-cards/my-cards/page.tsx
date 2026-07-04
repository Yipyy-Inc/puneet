import { redirect } from "next/navigation";

// Gift-card history now lives in the tabbed page at /customer/gift-cards
// ("Cards I sent" / "Cards I received"). This legacy route redirects there.
export default function LegacyMyGiftCardsPage() {
  redirect("/customer/gift-cards");
}
