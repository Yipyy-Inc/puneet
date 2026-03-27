import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
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
      <body className="font-sans antialiased" suppressHydrationWarning>
        <div className="flex min-h-screen flex-col pb-16">
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
