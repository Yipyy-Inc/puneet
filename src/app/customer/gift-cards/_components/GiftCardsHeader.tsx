"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useCustomerText } from "@/lib/customer/use-customer-text";

/**
 * The page title, in the reader's language. Its own client component because
 * the page is a Server Component (it awaits `searchParams`) and the locale is
 * read on the client.
 */
export function GiftCardsHeader() {
  const { t } = useCustomerText("giftCards");
  return (
    <PageHeader title={t("giftCards")} description={t("giveTheGiftOfHappy")} />
  );
}
