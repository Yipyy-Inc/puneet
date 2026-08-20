import { TriangleAlert } from "lucide-react";

// ============================================================================
// What replaced the "Add photo" button on every Daily Care log.
//
// ── WHAT THE BUTTON DID ───────────────────────────────────────────────────
//
//   const addPhoto = () => {
//     // TODO: open the real camera / library picker; mock URL for now.
//     setPhotos((prev) => [...prev, `mock://photo-${prev.length + 1}`]);
//   };
//
// No camera, no file picker, no upload, no storage. It appended a string, drew
// a grey square for it, and the record went out carrying `photoUrls`.
//
// The damage was not the placeholder. It was the GATE: a care task configured
// with `requiresPhotoProof` would not submit until a photo was attached, and
// pressing that button attached one. So a facility that had said "this dose
// must be photographed" got a log entry asserting a photograph existed, signed
// off by staff who had done exactly what the screen asked of them.
//
// That is the shape this project deletes rather than repairs — a control whose
// only function is to satisfy a check about something that never happened.
//
// ── WHY THIS SAYS SOMETHING RATHER THAN NOTHING ───────────────────────────
//
// Silently dropping it would leave the facility's `requiresPhotoProof` setting
// doing nothing, with no way to find that out except by asking why no photos
// ever appear. The requirement was real; the capture is what is missing, and
// saying so is what lets somebody decide whether to keep requiring it.
//
// It does NOT block submission. Refusing to log a dose because Yipyy cannot
// photograph it would turn a missing feature into an unrecordable medication.
// ============================================================================

export function PhotoProofNotice({ required }: { required: boolean }) {
  if (!required) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p className="text-sm/relaxed text-amber-900 dark:text-amber-200">
        This task is set to require photo proof, but Yipyy cannot capture photos
        yet. Log it as normal — the record will say what was done and who did
        it, and it will not claim a photograph was taken.
      </p>
    </div>
  );
}
