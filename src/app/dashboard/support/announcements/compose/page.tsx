import { Suspense } from "react";

import { AnnouncementComposer } from "../_components/announcement-composer";

export default function ComposeAnnouncementPage() {
  return (
    <Suspense fallback={null}>
      <AnnouncementComposer />
    </Suspense>
  );
}
