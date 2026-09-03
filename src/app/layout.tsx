import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/query-provider";
import { StagingBanner } from "@/components/staging-banner";
import "./globals.css";

// Inter was loaded here and used by exactly one component
// (MessageCenter.tsx), an inline style override with no deliberate reason
// behind it. design-system.md §4: "Plus Jakarta Sans throughout... Drop the
// unused Inter request." Dropped 2026-09-05, stage 1.

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Yipyy - Pet Services",
  description: "Manage your pet care business with ease",
  icons: {
    icon: "/yipyy-white.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Was hardcoded "en", which was true until the auth screens could be read in
  // French. `lang` is not decoration: it picks the voice a screen reader uses
  // and the dictionary a browser spell-checks and offers to translate with, so
  // a French page announced as English is read aloud with English phonetics.
  const locale = await getLocale();

  // ── WHOSE SITE THIS IS ──────────────────────────────────────────────────
  //
  // `x-facility-slug` is stamped by proxy.ts from the Host header, so on
  // pawradise.yipyy.com this footer is standing at the bottom of a business's
  // OWN page. Claiming "© Yipyy. All rights reserved." there reads as the wrong
  // company's site; "Powered by Yipyy" is what the page actually is.
  //
  // The SLUG only, never a database read. This layout wraps all 266 routes, and
  // a query here would put one on every request to serve a line of footer text.
  // The facility's real name is already the largest thing on the auth card.
  //
  // Free, as it happens: reading cookies for the locale above already opted
  // every route out of static rendering, so this header read costs nothing.
  const headerBag = await headers();
  const onFacilityHost = Boolean(headerBag.get("x-facility-slug"));

  // ── ONE PAGE PAINTS ITS OWN FOOTER ──────────────────────────────────────
  //
  // The coming-soon page is a full-bleed marketing page with its own footer
  // pill in the design. The global bar below would stack a second, differently
  // styled copyright line underneath it on a gradient background.
  //
  // `x-pathname` is stamped by proxy.ts on every request and is already what
  // portal-gate.ts reads; using it here beats a route group, which would mean
  // moving 266 routes to opt ONE of them out.
  const ownsItsFooter =
    headerBag.get("x-pathname")?.startsWith("/coming-soon") ?? false;

  return (
    <html
      lang={locale}
      className={` ${plusJakarta.variable} `}
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <script
          id="remove-extension-injected-attrs"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var attr = "bis_skin_checked";
                var isBlockedAttr = function (name) {
                  return typeof name === "string" && name.toLowerCase() === attr;
                };

                var removeAttr = function (node) {
                  if (!node || node.nodeType !== 1) return;

                  if (node.hasAttribute && node.hasAttribute(attr)) {
                    node.removeAttribute(attr);
                  }

                  if (!node.querySelectorAll) return;
                  var nodes = node.querySelectorAll("[" + attr + "]");
                  for (var i = 0; i < nodes.length; i += 1) {
                    nodes[i].removeAttribute(attr);
                  }
                };

                var originalSetAttribute = Element.prototype.setAttribute;
                Element.prototype.setAttribute = function (name, value) {
                  if (isBlockedAttr(name)) return;
                  return originalSetAttribute.call(this, name, value);
                };

                if (Element.prototype.setAttributeNS) {
                  var originalSetAttributeNS = Element.prototype.setAttributeNS;
                  Element.prototype.setAttributeNS = function (namespace, name, value) {
                    if (isBlockedAttr(name)) return;
                    return originalSetAttributeNS.call(this, namespace, name, value);
                  };
                }

                removeAttr(document.documentElement);

                var observer = new MutationObserver(function (mutations) {
                  for (var i = 0; i < mutations.length; i += 1) {
                    var mutation = mutations[i];

                    if (
                      mutation.type === "attributes" &&
                      mutation.attributeName === attr &&
                      mutation.target &&
                      mutation.target.removeAttribute
                    ) {
                      mutation.target.removeAttribute(attr);
                    }

                    if (mutation.type === "childList" && mutation.addedNodes) {
                      for (var j = 0; j < mutation.addedNodes.length; j += 1) {
                        removeAttr(mutation.addedNodes[j]);
                      }
                    }
                  }
                });

                observer.observe(document.documentElement, {
                  subtree: true,
                  childList: true,
                  attributes: true,
                  attributeFilter: [attr],
                });
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* Auth SDK quickstarts put a Sign In / Sign Up / user-button header
            here. That is written for a bare scaffold; this root layout wraps all
            266 routes, so a global header would stamp auth buttons over the
            customer portal, the facility dashboard and the public booking/review
            pages, each of which already has its own chrome and its own login
            screen. The provider is what the SDK actually needs — it is mounted,
            and the sign-in surface belongs on a dedicated route instead.

            AuthKitProvider is NOT optional even though most of this app reads
            auth on the server: it is what makes useAccessToken() work, and
            useWorkosSupabaseClient() is built on that. */}
        {/* Outside AuthKitProvider and outside the flex column on purpose: it
            is fixed, out of flow, and must render on every route including the
            ones that fail before a provider mounts. Returns null in production
            (ADR 0007), which is every deployment but staging.yipyy.com. */}
        <StagingBanner />
        <AuthKitProvider>
          <div className="flex min-h-screen flex-col" suppressHydrationWarning>
            <main className="flex-1">
              <QueryProvider>{children}</QueryProvider>
            </main>
            {/* Footer in normal flow (was fixed bottom-0, which permanently
                overlaid content). It now only appears at the true end of the
                page. Extra bottom padding on phones clears the facility mobile
                bottom-nav (fixed, md:hidden); removed at md where no nav exists. */}
            {!ownsItsFooter && (
              <footer className="bg-background text-muted-foreground flex items-center justify-center border-t px-4 py-4 pb-20 text-xs md:pb-4">
                {onFacilityHost
                  ? "Powered by Yipyy"
                  : "© 2026 Yipyy. All rights reserved."}
              </footer>
            )}
          </div>
          <Toaster />
        </AuthKitProvider>
      </body>
    </html>
  );
}
