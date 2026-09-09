import { isStaging } from "@/lib/deployment";
import { StagingNotice } from "@/components/staging-notice";

// ============================================================================
// "This is staging, and it is writing to the real database."
//
// ADR 0007. staging.yipyy.com runs the same image against the SAME Postgres as
// production, so a redesigned check-in on it checks a real dog in and a
// redesigned cancel cancels a real booking. The one thing that must never
// happen is somebody — the client, most likely — believing they are clicking
// around a sandbox.
//
// ── WHY IT IS FIXED AND NOT IN FLOW ───────────────────────────────────────
//
// A bar in normal flow shifts every `position: fixed` element in the app by its
// own height: the facility sidebar, the mobile bottom nav, every sticky table
// header. Staging exists to review a redesign, and a review is worthless if the
// layout being reviewed is not the layout that ships. Fixed and out of flow
// means what the client looks at is what production will render.
//
// `pointer-events-none` because it sits over the page: it must never eat a
// click on whatever is beneath it, and there is nothing on it to click.
//
// ── THE Z-INDEX IS OUTSIDE THE TOKEN SCALE, DELIBERATELY ──────────────────
//
// The design system's layers stop at `--z-tooltip: 700` and say no component
// writes its own (§5o). This is not a component — it is deployment chrome that
// production never renders — and it has to sit above a modal, a toast and a
// tooltip alike, because those are exactly the surfaces a redesign is reviewed
// on. A token for it would mean adding a layer to the product's scale to
// describe something the product does not have.
//
// ── AND WHY IT CANNOT BE STYLED AWAY ──────────────────────────────────────
//
// Solid `#8A5115` — the §3 warning ink at full strength, carrying white at
// 6.43:1, which is what rule 5 prescribes where a status must dominate. Written
// as literals rather than tokens on purpose: stage 1 has not landed yet, and
// when it does, this banner must not start inheriting whatever `--warning`
// becomes mid-redesign. A warning about the environment is not part of the
// thing being redesigned.
// ============================================================================

export function StagingBanner() {
  // `YIPYY_DEPLOYMENT` is not a NEXT_PUBLIC_ variable, so only the server can
  // answer this. The words are a client child, because the reader's language
  // is only knowable there.
  if (!isStaging()) return null;
  return <StagingNotice />;
}
