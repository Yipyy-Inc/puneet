import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
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
      className={`${inter.variable} ${plusJakarta.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <div className="min-h-screen flex flex-col pb-16">
          <main className="flex-1">{children}</main>
        </div>
        <footer className="fixed bottom-0 left-0 right-0 border-t px-4 py-4 text-xs text-muted-foreground flex items-center justify-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-40">
          © 2026 Yipyy. All rights reserved.
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
