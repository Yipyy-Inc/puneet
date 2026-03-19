import type { ReactNode } from "react";

interface CustomServicesLayoutProps {
  children: ReactNode;
}

export default function CustomServicesLayout({
  children,
}: CustomServicesLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
