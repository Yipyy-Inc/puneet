import { createElement } from "react";
import { resolveIcon } from "@/lib/service-registry";
import type { LucideIcon } from "lucide-react";

/**
 * Renders a resolved icon by name. Use this instead of
 * `const Icon = resolveIcon(name)` inside components to satisfy
 * react-hooks/static-components.
 */
export function DynamicIcon({
  name,
  ...props
}: { name: string } & React.ComponentProps<LucideIcon>) {
  return createElement(resolveIcon(name), props);
}
