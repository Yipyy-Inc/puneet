import { messages as facilityMessages } from "@/data/communications-hub";

/**
 * Total unread facility (staff) messages, sourced from the mock message data —
 * NOT localStorage. Mirrors the staff inbox's own rule (ContactList counts a
 * message as unread when `!hasRead`), so the header badge matches the unread
 * total shown in /facility/dashboard/messaging.
 *
 * Note: the mock has no live read-state store, so this reflects the seeded
 * `hasRead` flags. Marking a message read inside the inbox (local component
 * state) won't decrement it until a real messaging store exists — at which
 * point this helper should read from that store instead.
 */
export function getUnreadMessagesCount(): number {
  return facilityMessages.filter((m) => !m.hasRead).length;
}
