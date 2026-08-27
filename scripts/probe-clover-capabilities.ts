import { SQL } from "bun";

// ============================================================================
// Ask Clover what a facility's connection may actually do.
//
//   bun scripts/probe-clover-capabilities.ts <facilityId>
//
// A development aid, not a gate. `src/lib/clover/capabilities.ts` is the real
// implementation and runs inside the app; this exists because that module is
// `server-only` and cannot be imported by a bun script, and because the answer
// was needed before the screen that shows it existed.
//
// ── IT NEVER PRINTS A TOKEN ───────────────────────────────────────────────
//
// The access token is read straight into a variable and used in headers. It is
// never logged, never echoed and never returned — a merchant access token in a
// terminal transcript is a credential leak, and transcripts get pasted.
// ============================================================================

const facilityId = process.argv[2];
if (!facilityId) {
  console.error("usage: bun scripts/probe-clover-capabilities.ts <facilityId>");
  process.exit(1);
}

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is unset.");
  process.exit(1);
}

const sql = new SQL(url);

const [connection] = await sql`
  select environment, merchant_id
    from public.payment_connections
   where facility_id = ${facilityId}::uuid
     and processor = 'clover'
   limit 1
`;

if (!connection) {
  console.error(`No Clover connection for facility ${facilityId}.`);
  process.exit(1);
}

// Returns a SET of rows, and takes the facility alone — matching
// `validAccessToken` in lib/clover/connection.ts, which is the only other
// caller. Selecting it as a scalar returns a composite this cannot read.
const [credentials] = await sql`
  select * from public.payment_access_token(${facilityId}::uuid)
`;

const accessToken = credentials?.access_token as string | undefined;
if (!accessToken) {
  console.error("No access token is stored for that connection.");
  process.exit(1);
}

const HOSTS = {
  sandbox: {
    api: "https://apisandbox.dev.clover.com",
    ecommerce: "https://scl-sandbox.dev.clover.com",
  },
  production: {
    api: "https://api.clover.com",
    ecommerce: "https://scl.clover.com",
  },
} as const;

const hosts = HOSTS[connection.environment as keyof typeof HOSTS];
const merchantId = connection.merchant_id as string;

const headers = {
  Authorization: `Bearer ${accessToken}`,
  "X-Clover-Merchant-Id": merchantId,
  Accept: "application/json",
};

async function probe(label: string, origin: string, path: string) {
  try {
    const response = await fetch(new URL(path, origin), { headers });
    console.log(`${label.padEnd(28)} ${response.status}`);
    return response.status;
  } catch (error) {
    console.log(
      `${label.padEnd(28)} unreachable (${String(error).slice(0, 60)})`,
    );
    return 0;
  }
}

console.log(`\nfacility   ${facilityId}`);
console.log(`merchant   ${merchantId}  (${connection.environment})\n`);

await probe("merchant read", hosts.api, `/v3/merchants/${merchantId}`);
await probe("pakms public key", hosts.ecommerce, "/pakms/apikey");
await probe("charges read", hosts.ecommerce, "/v1/charges?limit=1");
await probe("customers read", hosts.ecommerce, "/v1/customers?limit=1");

// The one that matters: an EMPTY body cannot create a customer, so the status
// is purely about permission. 400 = allowed and rejected on merit; 403 = the
// app lacks Ecommerce "Write customers".
try {
  const write = await fetch(new URL("/v1/customers", hosts.ecommerce), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const body = await write.text().catch(() => "");
  console.log(`${"customers WRITE (probe)".padEnd(28)} ${write.status}`);
  console.log(`  -> ${body.slice(0, 300)}`);
  console.log(
    write.status === 401 || write.status === 403
      ? "\n  VERDICT: vaulting NOT permitted — the app is missing Ecommerce 'Write customers'."
      : write.status >= 200 && write.status < 300
        ? "\n  VERDICT: Clover accepted an EMPTY customer. Investigate before trusting this."
        : "\n  VERDICT: vaulting is permitted (the request was read and rejected on its merits).",
  );
} catch (error) {
  console.log(
    `customers WRITE (probe)      unreachable (${String(error).slice(0, 60)})`,
  );
}

await sql.end();
