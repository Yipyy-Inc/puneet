// ============================================================================
// §5i's wide modal — the size the Modal row grew on 2026-10-02 for a flow that
// sits beside its own preview: the booking wizard, the evaluator's form and
// the report card review (the client's mocks).
//
//   ≥640px  centred, the width of the screen less a margin, up to 1280px;
//           640–900px tall, so the footer stays in view.
//   <640px  a sheet from the bottom edge, nearly the full height, 24px top
//           corners (§5m: on a phone a modal is a full-height sheet).
//
// The frame CLIPS its overflow rather than hiding it: `overflow: hidden` is
// still scrolled by focus and scrollIntoView, and on 2026-10-02 a pill's
// hidden input scrolled the wizard's whole form out of its window that way.
// `overflow: clip` is never scrolled; a browser without it keeps `hidden`.
// ============================================================================

export const WIDE_DIALOG_FRAME =
  "bg-background flex max-h-[min(900px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 supports-[overflow:clip]:overflow-clip max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:h-[calc(100dvh-12px)] max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-0 max-sm:rounded-t-3xl max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 sm:h-[calc(100dvh-110px)] sm:min-h-[min(640px,calc(100dvh-2rem))] sm:w-[calc(100vw-3rem)] sm:max-w-[1280px] sm:rounded-3xl md:gap-0 md:p-0";
