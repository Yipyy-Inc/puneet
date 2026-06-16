import { clients } from "@/data/clients";

/**
 * Checkout UI rows usually carry only a petId. The reputation trigger engine
 * needs the owning client. Resolve it from the mock client ledger.
 */
export function resolveClientByPetId(
  petId: number,
): { clientId: number; clientName: string } | null {
  const client = clients.find((c) => c.pets?.some((p) => p.id === petId));
  return client ? { clientId: client.id, clientName: client.name } : null;
}
