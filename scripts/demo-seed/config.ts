/**
 * The demo facility, and the only one this seed will ever touch.
 *
 * "Paws & Co — Demo" was provisioned on 2026-09-10 for the client's own
 * account (admin@yipyy.com) through `provision_facility`. Staging and local
 * both write the PRODUCTION database, so the id and the slug are both checked
 * against the live row before a single statement runs — a seed pointed at the
 * wrong facility would be writing fake clients into a real business.
 *
 * Doggieville Mtl is owned by the same account and is a REAL business being
 * onboarded. It is named here only so the refusal below is explicit.
 */
export const DEMO_FACILITY_ID = "b2c0d85f-b0c4-4aef-9762-37b3a53d250d";
export const DEMO_FACILITY_SLUG = "paws-co-demo";
export const REFUSED_SLUGS = ["doggieville-mtl", "yipyy-demo-facility"];

export const DEMO_TIMEZONE = "America/Toronto";

/**
 * Who the seed acts as: the platform TEST admin (admin@yipyy.dev), the same
 * identity that provisioned the facility. Acting as a platform admin means
 * every row goes in through RLS and the same RPCs the app calls
 * (`create_booking`, `record_payment`), rather than around them as the
 * database owner. Never the client's own account.
 */
export const SEED_ACTOR_SUB = "user_01M07VSZEKXB7QEGACM7JWE3XV";
export const SEED_AUTHOR = "Demo seed";

/** Every seeded row carries this in `details.demoSeedKey` or its legacy id. */
export const SEED_PREFIX = "demo-pawsco";

/** Québec: GST 5% + QST 9.975%. */
export const TAX_RATE = 0.14975;
