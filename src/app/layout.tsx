import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/query-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={` ${inter.variable} ${plusJakarta.variable} `}
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <Script
          id="remove-extension-injected-attrs"
          strategy="beforeInteractive"
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
        <div
          className="flex min-h-screen flex-col pb-16"
          suppressHydrationWarning
        >
          <main className="flex-1">
            <QueryProvider>{children}</QueryProvider>
          </main>
        </div>
        <footer className="bg-background/95 text-muted-foreground supports-backdrop-filter:bg-background/80 fixed right-0 bottom-0 left-0 z-40 flex items-center justify-center border-t px-4 py-4 text-xs backdrop-blur-sm">
          © 2026 Yipyy. All rights reserved.
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
