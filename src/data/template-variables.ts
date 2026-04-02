// ========================================
// TEMPLATE VARIABLES REGISTRY
// ========================================
// Canonical registry for all merge-tag variables available
// across email, SMS, chat, automations, and marketing.

export type VariableCategory =
  | "customer"
  | "pet"
  | "booking"
  | "facility"
  | "staff"
  | "payment"
  | "links";

export type VariableContext =
  | "booking"
  | "customer"
  | "marketing"
  | "invoice"
  | "general";

export interface TemplateVariable {
  key: string;
  label: string;
  category: VariableCategory;
  description: string;
  example: string;
  fallback?: string;
  multiPet?: boolean;
  contextRequired?: VariableContext[];
}

// ── Customer Variables ──────────────────────────────────────

const customerVariables: TemplateVariable[] = [
  {
    key: "customer_first_name",
    label: "Customer First Name",
    category: "customer",
    description: "Customer's first name",
    example: "Sarah",
    fallback: "there",
  },
  {
    key: "customer_last_name",
    label: "Customer Last Name",
    category: "customer",
    description: "Customer's last name",
    example: "Johnson",
  },
  {
    key: "customer_full_name",
    label: "Customer Full Name",
    category: "customer",
    description: "Customer's full name",
    example: "Sarah Johnson",
    fallback: "Valued Customer",
  },
  {
    key: "customer_phone",
    label: "Customer Phone",
    category: "customer",
    description: "Customer's phone number",
    example: "(555) 123-4567",
    contextRequired: ["booking", "customer", "invoice"],
  },
  {
    key: "customer_email",
    label: "Customer Email",
    category: "customer",
    description: "Customer's email address",
    example: "sarah.johnson@email.com",
    contextRequired: ["booking", "customer", "invoice"],
  },
  {
    key: "customer_address",
    label: "Customer Address",
    category: "customer",
    description: "Customer's full street address",
    example: "123 Oak Street, Portland, OR 97201",
    contextRequired: ["customer", "invoice"],
  },
  {
    key: "customer_city",
    label: "Customer City",
    category: "customer",
    description: "Customer's city",
    example: "Portland",
    contextRequired: ["customer", "marketing"],
  },
];

// ── Pet Variables ───────────────────────────────────────────

const petVariables: TemplateVariable[] = [
  {
    key: "pet_name",
    label: "Pet Name",
    category: "pet",
    description: "Primary pet's name (first pet for multi-pet bookings)",
    example: "Buddy",
    fallback: "your pet",
    contextRequired: ["booking", "customer", "marketing", "general"],
  },
  {
    key: "pet_breed",
    label: "Pet Breed",
    category: "pet",
    description: "Pet's breed",
    example: "Golden Retriever",
    contextRequired: ["booking", "customer"],
  },
  {
    key: "pet_size",
    label: "Pet Size",
    category: "pet",
    description: "Pet's size category",
    example: "Large",
    contextRequired: ["booking", "customer"],
  },
  {
    key: "pet_age",
    label: "Pet Age",
    category: "pet",
    description: "Pet's age in years",
    example: "3",
    contextRequired: ["booking", "customer"],
  },
  {
    key: "pet_gender",
    label: "Pet Gender",
    category: "pet",
    description: "Pet's gender",
    example: "Male",
    contextRequired: ["booking", "customer"],
  },
  {
    key: "pet_names",
    label: "All Pet Names",
    category: "pet",
    description: "Comma-separated list of all pets in booking",
    example: "Buddy, Max, Luna",
    multiPet: true,
    contextRequired: ["booking", "customer", "marketing"],
  },
  {
    key: "pet_count",
    label: "Pet Count",
    category: "pet",
    description: "Number of pets in the booking",
    example: "2",
    multiPet: true,
    contextRequired: ["booking"],
  },
];

// ── Booking / Reservation Variables ─────────────────────────

const bookingVariables: TemplateVariable[] = [
  {
    key: "booking_id",
    label: "Booking ID",
    category: "booking",
    description: "Unique booking reference number",
    example: "BK-2024-001",
    contextRequired: ["booking"],
  },
  {
    key: "service_name",
    label: "Service Name",
    category: "booking",
    description:
      "Name of the booked service (Daycare, Boarding, Grooming, etc.)",
    example: "Daycare",
    contextRequired: ["booking"],
  },
  {
    key: "service_category",
    label: "Service Category",
    category: "booking",
    description: "Category of the service",
    example: "Pet Care",
    contextRequired: ["booking"],
  },
  {
    key: "booking_date",
    label: "Booking Date",
    category: "booking",
    description: "Date of the booking",
    example: "March 25, 2026",
    contextRequired: ["booking", "marketing"],
  },
  {
    key: "booking_time",
    label: "Booking Time",
    category: "booking",
    description: "Time of the booking",
    example: "9:00 AM",
    contextRequired: ["booking"],
  },
  {
    key: "booking_start_datetime",
    label: "Booking Start",
    category: "booking",
    description: "Full start date and time",
    example: "March 25, 2026 at 9:00 AM",
    contextRequired: ["booking"],
  },
  {
    key: "booking_end_datetime",
    label: "Booking End",
    category: "booking",
    description: "Full end date and time",
    example: "March 25, 2026 at 5:00 PM",
    contextRequired: ["booking"],
  },
  {
    key: "check_in_date",
    label: "Check-In Date",
    category: "booking",
    description: "Date of check-in",
    example: "March 25, 2026",
    contextRequired: ["booking"],
  },
  {
    key: "check_in_time",
    label: "Check-In Time",
    category: "booking",
    description: "Time of check-in",
    example: "9:00 AM",
    contextRequired: ["booking"],
  },
  {
    key: "check_out_date",
    label: "Check-Out Date",
    category: "booking",
    description: "Date of check-out",
    example: "March 28, 2026",
    contextRequired: ["booking"],
  },
  {
    key: "check_out_time",
    label: "Check-Out Time",
    category: "booking",
    description: "Time of check-out",
    example: "5:00 PM",
    contextRequired: ["booking"],
  },
  {
    key: "booking_status",
    label: "Booking Status",
    category: "booking",
    description: "Current status of the booking",
    example: "Confirmed",
    contextRequired: ["booking"],
  },
  {
    key: "booking_addons",
    label: "Booking Add-ons",
    category: "booking",
    description: "List of add-on services",
    example: "Extra Playtime, Nail Trim",
    contextRequired: ["booking"],
  },
];

// ── Facility Variables ──────────────────────────────────────

const facilityVariables: TemplateVariable[] = [
  {
    key: "facility_name",
    label: "Facility Name",
    category: "facility",
    description: "Name of the facility",
    example: "Doggieville MTL",
  },
  {
    key: "facility_phone",
    label: "Facility Phone",
    category: "facility",
    description: "Facility phone number",
    example: "(514) 555-0100",
  },
  {
    key: "facility_email",
    label: "Facility Email",
    category: "facility",
    description: "Facility email address",
    example: "info@doggievillemtl.com",
  },
  {
    key: "facility_address",
    label: "Facility Address",
    category: "facility",
    description: "Facility street address",
    example: "456 Bark Avenue, Montreal, QC H2X 1Y4",
    contextRequired: ["booking", "customer", "marketing", "general"],
  },
  {
    key: "facility_website",
    label: "Facility Website",
    category: "facility",
    description: "Facility website URL",
    example: "www.doggievillemtl.com",
    contextRequired: ["booking", "customer", "marketing", "general"],
  },
  {
    key: "facility_checkin_hours",
    label: "Check-In Hours",
    category: "facility",
    description: "Facility check-in hours",
    example: "7:00 AM - 10:00 AM",
    contextRequired: ["booking"],
  },
];

// ── Staff Variables ─────────────────────────────────────────

const staffVariables: TemplateVariable[] = [
  {
    key: "assigned_staff_name",
    label: "Assigned Staff",
    category: "staff",
    description: "Name of the assigned staff member",
    example: "Emma Wilson",
    contextRequired: ["booking"],
  },
  {
    key: "groomer_name",
    label: "Groomer Name",
    category: "staff",
    description: "Name of the assigned groomer",
    example: "Lisa Chen",
    contextRequired: ["booking"],
  },
  {
    key: "trainer_name",
    label: "Trainer Name",
    category: "staff",
    description: "Name of the assigned trainer",
    example: "Mike Torres",
    contextRequired: ["booking"],
  },
];

// ── Payment / Invoice Variables ─────────────────────────────

const paymentVariables: TemplateVariable[] = [
  {
    key: "invoice_id",
    label: "Invoice ID",
    category: "payment",
    description: "Unique invoice reference number",
    example: "10031",
    contextRequired: ["invoice"],
  },
  {
    key: "invoice_total",
    label: "Invoice Total",
    category: "payment",
    description: "Total amount on the invoice",
    example: "$150.00",
    contextRequired: ["invoice"],
  },
  {
    key: "amount_due",
    label: "Amount Due",
    category: "payment",
    description: "Outstanding balance",
    example: "$75.00",
    contextRequired: ["invoice"],
  },
  {
    key: "amount_paid",
    label: "Amount Paid",
    category: "payment",
    description: "Amount already paid",
    example: "$75.00",
    contextRequired: ["invoice"],
  },
  {
    key: "payment_link",
    label: "Payment Link",
    category: "payment",
    description: "Link for the customer to make a payment",
    example: "https://pay.yipyy.com/inv-0042",
    contextRequired: ["invoice"],
  },
  {
    key: "receipt_link",
    label: "Receipt Link",
    category: "payment",
    description: "Link to view/download receipt",
    example: "https://yipyy.com/receipt/inv-0042",
    contextRequired: ["invoice"],
  },
  {
    key: "due_date",
    label: "Due Date",
    category: "payment",
    description: "Payment due date",
    example: "April 1, 2026",
    contextRequired: ["invoice"],
  },
];

// ── Links / Action Variables ────────────────────────────────

const linkVariables: TemplateVariable[] = [
  {
    key: "portal_link",
    label: "Customer Portal Link",
    category: "links",
    description: "Link to the customer portal",
    example: "https://portal.yipyy.com",
  },
  {
    key: "booking_details_link",
    label: "Booking Details Link",
    category: "links",
    description: "Link to view booking details",
    example: "https://portal.yipyy.com/bookings/BK-2024-001",
    contextRequired: ["booking"],
  },
  {
    key: "yipyygo_link",
    label: "YipyyGo Link",
    category: "links",
    description: "Link to the YipyyGo pre-arrival form",
    example: "https://go.yipyy.com/form/abc123",
    contextRequired: ["booking"],
  },
  {
    key: "invoice_link",
    label: "Invoice Link",
    category: "links",
    description: "Link to view the invoice",
    example: "https://portal.yipyy.com/invoices/INV-2024-0042",
    contextRequired: ["invoice"],
  },
  {
    key: "cancel_link",
    label: "Cancel Booking Link",
    category: "links",
    description: "Link to cancel the booking",
    example: "https://portal.yipyy.com/bookings/BK-2024-001/cancel",
    contextRequired: ["booking"],
  },
];

// ── Aggregate Registry ──────────────────────────────────────

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  ...customerVariables,
  ...petVariables,
  ...bookingVariables,
  ...facilityVariables,
  ...staffVariables,
  ...paymentVariables,
  ...linkVariables,
];

// ── Category metadata ───────────────────────────────────────

export const VARIABLE_CATEGORY_LABELS: Record<VariableCategory, string> = {
  customer: "Customer",
  pet: "Pet",
  booking: "Booking",
  facility: "Facility",
  staff: "Staff",
  payment: "Payment",
  links: "Links & Actions",
};

export const VARIABLE_CATEGORY_ORDER: VariableCategory[] = [
  "customer",
  "pet",
  "booking",
  "facility",
  "staff",
  "payment",
  "links",
];

// ── Helper Functions ────────────────────────────────────────

export function getVariablesByCategory(
  category: VariableCategory,
): TemplateVariable[] {
  return TEMPLATE_VARIABLES.filter((v) => v.category === category);
}

export function getVariablesForContext(
  context: VariableContext,
): TemplateVariable[] {
  return TEMPLATE_VARIABLES.filter(
    (v) => !v.contextRequired || v.contextRequired.includes(context),
  );
}

export function getVariableDisplayTag(key: string): string {
  return `{{${key}}}`;
}

export function getGroupedVariablesForContext(context: VariableContext): {
  category: VariableCategory;
  label: string;
  variables: TemplateVariable[];
}[] {
  const contextVars = getVariablesForContext(context);
  return VARIABLE_CATEGORY_ORDER.map((category) => ({
    category,
    label: VARIABLE_CATEGORY_LABELS[category],
    variables: contextVars.filter((v) => v.category === category),
  })).filter((group) => group.variables.length > 0);
}
