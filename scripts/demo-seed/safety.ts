/**
 * What a seeded row may never contain.
 *
 * Production's `messaging-tick` timer serves EVERY facility, and staging's
 * send suppression is per container, not per facility — so a seeded client
 * with a real address is one enabled automation away from a real email. On
 * 2026-08-29 a fixture address did reach a real inbox. `.invalid` is reserved
 * by RFC 2606 and can never resolve; 555-01xx is the North American range
 * reserved for fiction.
 */
const SAFE_EMAIL = /^[a-z0-9._-]+@([a-z0-9-]+\.)*example\.invalid$/;
const SAFE_PHONE = /^\+1 (514|450|438) 555-01\d{2}$/;

export function assertSafeContact(
  where: string,
  email: string,
  phone?: string,
) {
  if (!SAFE_EMAIL.test(email)) {
    throw new Error(`${where}: "${email}" is not an @example.invalid address`);
  }
  if (phone !== undefined && !SAFE_PHONE.test(phone)) {
    throw new Error(`${where}: "${phone}" is not a 555-01xx number`);
  }
}
