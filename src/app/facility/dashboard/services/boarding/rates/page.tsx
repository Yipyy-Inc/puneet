import { BoardingRatesView } from "./_components/boarding-rates-view";

// ============================================================================
// Services → Boarding → Rates: what a stay costs, and which room types it
// books into. One tab since 2026-09-26.
//
// ── WHY THE MENU AND THE RATES BECAME ONE TAB ─────────────────────────────
//
// There were two. "Menu" listed `boarding_services`: a priced item that names
// the lodging types it books into. "Rates" edited
// `room_categories.default_base_price`, and every rate it created was a new
// ROOM TYPE, with no link to the kennels built on Rooms. A facility asking
// "which room does this rate book?" had nowhere to answer it on that tab.
//
// The client read the two tabs as one thing, and they were right: the menu
// item IS the rate. So Rates shows the menu now, and a room type's own price
// lives only on Rooms, where it is the fallback for a booking that names no
// rate. The old /menu address redirects here.
// ============================================================================
export default function BoardingRatesPage() {
  return <BoardingRatesView />;
}
