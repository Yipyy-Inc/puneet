import { clientCommunications } from "@/data/communications";
import { messages } from "@/data/communications-hub";

/**
 * Whether a client is set up in the Messaging module — i.e. they already have a
 * messaging presence: an inbox thread or a logged communication record on file.
 *
 * The app has no standalone "messaging profile" entity (messaging identity is
 * just the client's numeric id), so "has a profile" is modelled as "has any
 * message/communication history". Action buttons that fire an automated message
 * to an owner gate on this so they only appear for owners the facility can
 * actually message. A `null`/`undefined` id (e.g. a drop-in guest with no
 * client record) never qualifies.
 */
export function hasMessagingProfile(
  clientId: number | null | undefined,
): boolean {
  if (clientId == null) return false;
  return (
    clientCommunications.some((c) => c.clientId === clientId) ||
    messages.some((m) => m.clientId === clientId)
  );
}
