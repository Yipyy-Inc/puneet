"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, LoaderCircle, ScanLine } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { useResolveCheckInPass } from "@/lib/api/yipyy-go";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { parseCheckInCode } from "@/lib/yipyy-go/parse-check-in-code";

import { ArrivalList } from "./arrival-list";
import { CheckInPanel } from "./check-in-panel";

// ============================================================================
// The check-in desk (§5s, §5d2, §6 rules 5 and 7).
//
// An owner’s check-in code opens their booking three ways: a phone camera
// opens the QR code’s link, which lands here with `?code=`; a scanner types
// that link into the search and presses Enter; or staff paste the bare code.
// The server resolves it (resolve_yipyy_go_check_in_pass), and answers the
// same refusal for a code that is wrong, replaced, expired or for a service
// this person cannot check in. Without a code, the desk finds the arrival by
// name or booking number.
//
// It replaces /facility/checkin, which validated tokens from a Map in the
// browser that made them, searched fixture bookings, and wrote nothing.
// ============================================================================

type Open = { ref: number; source: "code" | "search" };

export function CheckInKiosk() {
  const { t } = useStaffText("kiosk");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { mutate: resolve, isPending: resolving } = useResolveCheckInPass();
  const [addressCode] = useState(() => params.get("code"));
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Open | null>(null);
  const [refused, setRefused] = useState(
    () => addressCode !== null && parseCheckInCode(addressCode) === null,
  );

  // §5t: the search runs when the typing pauses.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [input]);

  // A code in the address is read once, and taken out of the address, where
  // it would otherwise sit in the history of a shared desk.
  useEffect(() => {
    if (addressCode === null) return;
    router.replace(pathname);
    const code = parseCheckInCode(addressCode);
    if (!code) return;
    resolve(code, {
      onSuccess: ({ bookingRef }) =>
        setOpen({ ref: bookingRef, source: "code" }),
      onError: () => setRefused(true),
    });
  }, [addressCode, pathname, resolve, router]);

  const openCode = (code: string) => {
    setRefused(false);
    resolve(code, {
      onSuccess: ({ bookingRef }) => {
        setInput("");
        setOpen({ ref: bookingRef, source: "code" });
      },
      onError: () => setRefused(true),
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      {open ? (
        <CheckInPanel
          key={open.ref}
          bookingRef={open.ref}
          source={open.source}
          onBack={() => setOpen(null)}
        />
      ) : (
        <>
          <form
            role="search"
            className="space-y-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              // Only on Enter: a scanner types a link one character at a
              // time, and a code read halfway is a code refused.
              const code = parseCheckInCode(input);
              if (code) openCode(code);
            }}
          >
            <Label htmlFor="kiosk-search">{t("searchLabel")}</Label>
            <div className="relative">
              <ScanLine
                aria-hidden
                className="text-ink-tertiary pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
              />
              <Input
                id="kiosk-search"
                type="search"
                autoComplete="off"
                value={input}
                placeholder={t("searchPlaceholder")}
                onChange={(event) => setInput(event.target.value)}
                className="min-h-12 pl-12"
              />
            </div>
          </form>

          {resolving && (
            <p
              role="status"
              className="text-ink-secondary flex items-center gap-2 text-[14.5px]"
            >
              <LoaderCircle
                aria-hidden
                className="size-5 animate-spin motion-reduce:animate-none"
              />
              {t("resolving")}
            </p>
          )}
          {refused && !resolving && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertTitle>{t("codeNotHereTitle")}</AlertTitle>
              <AlertDescription>{t("codeNotHereText")}</AlertDescription>
            </Alert>
          )}

          <section aria-labelledby="kiosk-arrivals" className="space-y-3">
            <h2
              id="kiosk-arrivals"
              className="text-heading text-[17px] font-bold"
            >
              {t("arrivalsTitle")}
            </h2>
            <ArrivalList
              query={query}
              onOpen={(arrival) =>
                setOpen({ ref: arrival.bookingRef, source: "search" })
              }
            />
          </section>
        </>
      )}
    </div>
  );
}
