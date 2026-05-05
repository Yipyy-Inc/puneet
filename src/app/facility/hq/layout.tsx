import { LocationAccessGuard } from "@/components/hq/LocationAccessGuard";

export default function HQLayout({ children }: { children: React.ReactNode }) {
  return <LocationAccessGuard requireHq>{children}</LocationAccessGuard>;
}
