// Auth pages should not have the groomer header
export default function GroomerAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
