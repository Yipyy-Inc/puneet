import { LoaderCircle } from "lucide-react";

import { RouteState } from "@/components/ui/route-state";

// §5d2 state ladder, "Loading · first paint": pose `loading`, no action. The
// spinning glyph is the one moving thing on the view (§4) — `yy-float` is
// refused on this pose for exactly that reason, and the pose itself is a still
// image. The previous screen said "Please wait", which §5r bans.
export default function Loading() {
  return (
    <RouteState
      pose="loading"
      icon={LoaderCircle}
      inkClassName="text-primary"
      title="Getting your day ready"
      description="This takes a moment on the first load."
      spin
      className="min-h-screen"
    />
  );
}
