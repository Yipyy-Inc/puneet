import type { Metadata } from "next";
import Image from "next/image";
import { Poppins } from "next/font/google";
import {
  CalendarDays,
  GraduationCap,
  House,
  PawPrint,
  Scissors,
  ShoppingBag,
  Sun,
} from "lucide-react";

import { WaitlistForm } from "./_components/waitlist-form";
import styles from "./coming-soon.module.css";

// ============================================================================
// Yipyy's coming-soon page.
//
// ── A SERVER COMPONENT, WITH ONE CLIENT ISLAND ────────────────────────────
//
// Everything here is static: the gradient, the mascot, the six service cards,
// the footer. The only thing that needs a browser is the form, so that is the
// only thing marked "use client". This is the CLAUDE.md rule applied to the one
// page most likely to be someone's first impression, and where the cost of
// shipping the whole app's client bundle would be paid by every visitor.
//
// ── POPPINS IS LOADED HERE, NOT IN THE ROOT LAYOUT ────────────────────────
//
// The design calls for Poppins. The app runs on Inter and Plus Jakarta Sans,
// and adding a third family to the root layout would download it on all 266
// routes to serve this one. `next/font` is scoped by where it is called, so the
// variable below reaches this page and nothing else.
// ============================================================================

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yipyy — Coming Soon",
  description:
    "One platform to run your entire pet care facility. Yipyy brings bookings, care and payments together. Join the waitlist for early-adopter access.",
  openGraph: {
    title: "Yipyy — Coming Soon",
    description:
      "One platform to run your entire pet care facility. Join the waitlist.",
    type: "website",
    images: [{ url: "/yipyy-transparent.png" }],
  },
  robots: { index: true, follow: true },
};

/** The six modules named on the card grid, in the design's order. */
const SERVICES = [
  { label: "Boarding", Icon: House },
  { label: "Daycare", Icon: Sun },
  { label: "Grooming", Icon: Scissors },
  { label: "Training", Icon: GraduationCap },
  { label: "Retail", Icon: ShoppingBag },
  { label: "Scheduling", Icon: CalendarDays },
] as const;

export default function ComingSoonPage() {
  // ── NO WAY BACK INTO THE APP FROM HERE, DELIBERATELY ────────────────────
  //
  // This page is written for strangers. A sign-in link sat beside the status
  // pill until 2026-08-26 and was removed on request: the apex is the public
  // face of the product, and somebody who already has an account reaches the
  // software at its own address. Everything on this page stays session-free
  // and cacheable, which is what the removal preserves.
  return (
    <div className={`${poppins.variable} ${styles.page}`}>
      <div className={styles.vignette} aria-hidden="true" />

      {/* Decoration only — hidden from the accessibility tree entirely, since
          "paw print" announced four times tells a screen-reader user nothing. */}
      <div className={styles.paws} aria-hidden="true">
        <span className={`${styles.paw} ${styles.pawTopRight}`}>
          <PawPrint size="100%" strokeWidth={2} />
        </span>
        <span className={`${styles.paw} ${styles.pawTopLeft}`}>
          <PawPrint size="100%" strokeWidth={2} />
        </span>
        <span className={`${styles.paw} ${styles.pawBottomLeft}`}>
          <PawPrint size="100%" strokeWidth={2} />
        </span>
        <span className={`${styles.paw} ${styles.pawBottomRight}`}>
          <PawPrint size="100%" strokeWidth={2} />
        </span>
      </div>

      <div className={styles.shell}>
        <header className={styles.header}>
          <Image
            src="/yipyy-transparent.png"
            alt="Yipyy"
            width={3462}
            height={1394}
            className={styles.logo}
            priority
          />
          <div className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            <span className={styles.badgeText}>Launching 2026</span>
          </div>
        </header>

        <main className={styles.main}>
          <section className={styles.copy}>
            <h1 className={styles.title}>
              Coming <span className={styles.titleAccent}>Soon</span>
            </h1>

            <p className={styles.subtitle}>
              One platform to run your{" "}
              <span className={styles.subtitleAccent}>
                entire pet care facility.
              </span>
            </p>

            <p className={styles.lede}>
              Yipyy brings bookings, care and payments together — so your team
              spends less time on admin and more time with the animals.
            </p>
          </section>

          {/* A sibling of the copy, not a child of it — see the note in the
              stylesheet. On desktop a named grid area puts it straight back
              underneath; on a phone it can then sit BELOW the form, where
              supporting detail belongs. */}
          <ul className={styles.services}>
            {SERVICES.map(({ label, Icon }) => (
              <li key={label} className={styles.service}>
                <span className={styles.serviceIcon} aria-hidden="true">
                  <Icon size="100%" strokeWidth={2} />
                </span>
                <span className={styles.serviceLabel}>{label}</span>
              </li>
            ))}
          </ul>

          <section className={styles.mascotWrap}>
            <span className={styles.mascotGlow} aria-hidden="true" />
            <Image
              // The retired render is gone; `welcome` is §5d2's own pose
              // for the product's front door. Square 720, not the old
              // 1151×1367 portrait — the rule below is width/height auto with
              // object-fit: contain, so the new ratio is honoured, not cropped.
              src="/mascot/yipyy-mascot-welcome.webp"
              // Empty by design (§5d1): he sits beside the words, never
              // instead of them, and the headline already says what this page
              // is. The old string also described a tablet this pose is not
              // holding.
              alt=""
              width={720}
              height={720}
              className={styles.mascot}
              priority
              sizes="(max-width: 1100px) 60vw, 420px"
            />
          </section>

          <section className={styles.formColumn}>
            <div className={styles.card}>
              <WaitlistForm />
            </div>
          </section>
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerPill}>
            <Image
              src="/yipyy-transparent.png"
              alt=""
              width={3462}
              height={1394}
              className={styles.footerLogo}
              aria-hidden="true"
            />
            <span className={styles.footerDivider} aria-hidden="true" />
            <span className={styles.footerText}>
              Trusted by pet care professionals. Built for modern facilities.{" "}
              <strong className={styles.footerAccent}>Coming soon.</strong>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
