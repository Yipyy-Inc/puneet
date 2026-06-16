import { clients } from "@/data/clients";

/**
 * Grant apology store credit to a client (e.g. service-recovery for a negative
 * review). Mutates the shared mock client ledger and records a transaction.
 * Returns the client's new balance, or null if the client wasn't found.
 */
export function grantApologyCredit(
  clientId: number,
  amount: number,
  reason = "Service recovery — apology credit",
  bookingId?: number,
): number | null {
  const client = clients.find((c) => c.id === clientId);
  if (!client) return null;
  if (!client.storeCredit) {
    client.storeCredit = { balance: 0, transactions: [] };
  }

  client.storeCredit.balance += amount;
  client.storeCredit.transactions.push({
    date: new Date().toISOString(),
    amount,
    type: "added",
    source: reason,
    ...(bookingId != null ? { bookingId } : {}),
  });
  return client.storeCredit.balance;
}
