import type { InvoiceTemplate } from "@/types/invoice-template";

const STORAGE_KEY = "yipyy:invoice-template";

export const defaultInvoiceTemplate: InvoiceTemplate = {
  logoUrl: "/yipyy-transparent.png",
  facilityName: "Example Pet Care Facility",
  addressLine1: "123 Example St",
  addressLine2: "Example City",
  phone: "(555) 111-2222",
  email: "info@examplepetcare.com",
  website: "",
  taxNumbers: "GST: RT 123456789 · QST: QT 987654321",
  accentColor: "#0f172a",
  footerText:
    "Thank you for trusting us with your furry family member. We appreciate your business.",
  signatureEnabled: true,
  signatureLabel: "Client Signature",
  showThankYou: true,
  thankYouMessage: "We'll see you and your pup again soon!",
};

export function loadInvoiceTemplate(): InvoiceTemplate {
  if (typeof window === "undefined") return defaultInvoiceTemplate;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultInvoiceTemplate;
    const parsed = JSON.parse(raw);
    return { ...defaultInvoiceTemplate, ...parsed };
  } catch {
    return defaultInvoiceTemplate;
  }
}

export function saveInvoiceTemplate(template: InvoiceTemplate): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
}
