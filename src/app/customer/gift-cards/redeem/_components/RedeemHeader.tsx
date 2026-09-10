"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useCustomerText } from "@/lib/customer/use-customer-text";

/**
 * The page title, in the reader's language. Its own client component because
 * the page is a Server Component and the locale is read on the client.
 */
export function RedeemHeader() {
  const { t } = useCustomerText("giftCardRedeem");
  return (
    <PageHeader
      title={t("redeemAGiftCard")}
      description={t("redeemDescription")}
    />
  );
}
