import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import type { ReceiptInput, ReceiptLine } from "@/lib/clover/receipt";
import { emailItemisedReceipt } from "@/lib/clover/receipt-delivery";
import { formatDateTimeInZone } from "@/lib/i18n/format";
import { NO_TAX, taxConfigSchema } from "@/lib/settings/tax";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";

// ============================================================================
// Email the itemised receipt for a recorded till sale.
//
// The till's "Email Receipt" button was `console.log("Sending receipt to:")`
// and closed the dialog, so a customer was told a receipt was coming and none
// ever left. This builds the receipt from the sale AS RECORDED (never from what
// the browser says was in the basket) and sends it through
// `emailItemisedReceipt`, the sender the counter terminal already uses.
//
// The sale is read under the caller's own RLS (`retail_sales_read` admits the
// facility's members) and narrowed to the session's facility, so an id from
// another business is a 404. The address is the one typed at the counter: the
// person paying may not be the person on the account.
//
// Sending never affects the sale. The answer says whether the email went and,
// when it did not, why — for staff, who can print instead.
// ============================================================================

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  to: z.string().trim().min(3).max(320),
  locale: z.enum(["en", "fr"]).optional(),
});

interface SaleItem {
  name?: string;
  variantName?: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  total?: number;
}

interface SaleRow {
  id: string;
  number: number;
  items: SaleItem[] | null;
  subtotal: number | string;
  discount_total: number | string | null;
  tax_total: number | string | null;
  tip: number | string | null;
  total: number | string;
  tender: string | null;
  created_at: string;
  clients: { name: string | null } | null;
}

interface FacilityRow {
  name: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  } | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  timezone: string | null;
}

const cents = (value: number | string | null | undefined) =>
  Math.round(Number(value ?? 0) * 100);

function addressLine(address: FacilityRow["address"]): string | null {
  if (!address) return null;
  const line = [
    address.street,
    address.city,
    [address.state, address.zipCode].filter(Boolean).join(" "),
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  return line || null;
}

function linesFrom(items: SaleItem[] | null): ReceiptLine[] {
  return (items ?? []).map((item) => {
    const quantity = Number(item.quantity ?? 1);
    const name = item.variantName
      ? `${item.name ?? ""} — ${item.variantName}`
      : (item.name ?? "");
    const amount =
      item.total ??
      quantity * Number(item.unitPrice ?? 0) - Number(item.discount ?? 0);
    return {
      label: quantity === 1 ? name : `${quantity} × ${name}`,
      amountCents: cents(amount),
    };
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 403 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "An email address to send the receipt to." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  const [{ data: saleData }, { data: facilityData }, { data: taxRow }] =
    await Promise.all([
      supabase
        .from("retail_sales")
        .select(
          "id, number, items, subtotal, discount_total, tax_total, tip, total, tender, created_at, clients(name)",
        )
        .eq("id", id)
        .eq("facility_id", context.facilityId)
        .maybeSingle(),
      supabase
        .from("facilities")
        .select("name, address, phone, email, website, logo_url, timezone")
        .eq("id", context.facilityId)
        .maybeSingle(),
      supabase
        .from("facility_settings")
        .select("value")
        .eq("facility_id", context.facilityId)
        .eq("domain", "tax_config")
        .maybeSingle(),
    ]);

  const sale = saleData as unknown as SaleRow | null;
  const facility = facilityData as unknown as FacilityRow | null;
  if (!sale || !facility) {
    return NextResponse.json({ error: "No such sale." }, { status: 404 });
  }

  const tax = taxConfigSchema.safeParse(taxRow?.value);
  const taxConfig = tax.success ? tax.data : NO_TAX;
  const registrations = taxConfig.showRegistrationOnInvoice
    ? taxConfig.taxes
        .filter((entry) => entry.enabled && entry.registrationNumber.trim())
        .map((entry) => `${entry.name}: ${entry.registrationNumber}`)
        .join(" · ")
    : "";

  const input: ReceiptInput = {
    facility: {
      name: facility.name,
      address: addressLine(facility.address),
      phone: facility.phone,
      email: facility.email,
      website: facility.website,
      taxRegistrations: registrations || null,
      logoUrl: facility.logo_url || null,
    },
    bookingRef: null,
    reference: `#${sale.number}`,
    clientName: sale.clients?.name ?? null,
    petNames: [],
    lines: linesFrom(sale.items),
    discountCents: cents(sale.discount_total),
    subtotalCents: cents(sale.subtotal),
    taxLines: [],
    taxTotalCents: cents(sale.tax_total),
    tipCents: cents(sale.tip),
    totalCents: cents(sale.total),
    paymentMethod: sale.tender,
    cardBrand: null,
    cardLast4: null,
    entryMethod: null,
    authCode: null,
    processorPaymentId: null,
    printedAt: formatDateTimeInZone(
      sale.created_at,
      parsed.data.locale ?? "en",
      facility.timezone ?? DEFAULT_TIMEZONE,
    ),
  };

  const result = await emailItemisedReceipt(parsed.data.to, input);
  return NextResponse.json(result);
}
