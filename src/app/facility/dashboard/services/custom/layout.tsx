import type { ReactNode } from "react";

interface CustomServicesLayoutProps {
  children: ReactNode;
}

export default function CustomServicesLayout({
  children,
}: CustomServicesLayoutProps) {
  return <div className="bg-background min-h-screen">{children}</div>;
}
