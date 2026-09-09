"use client";

import { useShellText } from "@/lib/shell/use-shell-text";

/**
 * The footer under all 266 routes.
 *
 * Two strings, and which one shows is decided on the SERVER — `x-facility-slug`
 * is stamped from the Host header, and on a business's own subdomain claiming
 * "© Yipyy. All rights reserved." would be the wrong company's claim. So the
 * decision stays in the layout and only the WORDS come down here, where the
 * reader's language is actually knowable.
 */
export function RootFooter({
  onFacilityHost,
  className,
}: {
  onFacilityHost: boolean;
  className: string;
}) {
  const t = useShellText("banners");
  return (
    <footer className={className}>
      {onFacilityHost ? t("poweredBy") : t("copyright")}
    </footer>
  );
}
