// Auth pages should not have the customer header
export default function CustomerAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
