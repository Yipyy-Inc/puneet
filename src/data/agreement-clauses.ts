// Phase-1 clause library for the Agreement Template Builder. Pre-written legal
// clauses grouped by category; each `content` is an HTML fragment inserted at
// the editor cursor and remains fully editable afterwards. This is built-in
// authoring content (not backend "rows"), so it ships as static mock data.
//
// Types live in `@/lib/api/agreements` (type-only import — no runtime cycle).

import type { AgreementClauseCategory } from "@/lib/api/agreements";

export const CLAUSE_LIBRARY: AgreementClauseCategory[] = [
  {
    id: "payment-terms",
    label: "Payment Terms",
    clauses: [
      {
        id: "payment-due",
        title: "Payment Due on Booking",
        content:
          "<h3>Payment Terms</h3><p>Full payment for all reserved services is due at the time of booking unless a deposit arrangement has been agreed in writing. Bookings are not confirmed until payment or the required deposit has been received.</p>",
      },
      {
        id: "late-fees",
        title: "Late Payment &amp; Fees",
        content:
          "<h3>Late Payment</h3><p>Invoices not settled by the stated due date may incur a late fee of 1.5% per month on the outstanding balance. The facility reserves the right to suspend services on any account with overdue amounts.</p>",
      },
      {
        id: "refund-policy",
        title: "Refunds",
        content:
          "<h3>Refund Policy</h3><p>Deposits are refundable when a cancellation is received at least 48 hours before the scheduled service. Cancellations inside 48 hours, and no-shows, forfeit the deposit.</p>",
      },
    ],
  },
  {
    id: "liability",
    label: "Liability",
    clauses: [
      {
        id: "assumption-of-risk",
        title: "Assumption of Risk",
        content:
          "<h3>Assumption of Risk</h3><p>The owner acknowledges that interaction between animals carries inherent risks. The owner voluntarily assumes all such risks associated with the care, boarding, daycare, grooming or training of their pet.</p>",
      },
      {
        id: "release-of-liability",
        title: "Release of Liability",
        content:
          "<h3>Release of Liability</h3><p>Except in cases of gross negligence or willful misconduct, the owner releases the facility, its owners and staff from any and all liability for injury, illness, loss or death of the pet occurring while in the facility's care.</p>",
      },
      {
        id: "veterinary-care",
        title: "Emergency Veterinary Care",
        content:
          "<h3>Emergency Veterinary Care</h3><p>The owner authorizes the facility to obtain emergency veterinary treatment for the pet if deemed necessary, and agrees to be responsible for all resulting veterinary costs.</p>",
      },
    ],
  },
  {
    id: "data-privacy",
    label: "Data Privacy",
    clauses: [
      {
        id: "data-collection",
        title: "Collection &amp; Use of Data",
        content:
          "<h3>Data Privacy</h3><p>The facility collects and processes personal and pet information solely to provide and improve its services. Data is handled in accordance with applicable privacy laws and is never sold to third parties.</p>",
      },
      {
        id: "media-consent",
        title: "Photo &amp; Media Consent",
        content:
          "<h3>Photo &amp; Media Consent</h3><p>The owner consents to the facility photographing or recording their pet for care updates and, where indicated, for marketing purposes. Consent may be withdrawn in writing at any time.</p>",
      },
    ],
  },
  {
    id: "termination",
    label: "Termination",
    clauses: [
      {
        id: "termination-notice",
        title: "Termination for Convenience",
        content:
          "<h3>Termination</h3><p>Either party may terminate this agreement with fourteen (14) days' written notice. Services rendered up to the termination date remain payable in full.</p>",
      },
      {
        id: "termination-cause",
        title: "Termination for Cause",
        content:
          "<h3>Termination for Cause</h3><p>The facility may terminate services immediately if a pet poses a danger to staff, other animals or property, or if the owner materially breaches this agreement.</p>",
      },
    ],
  },
  {
    id: "general",
    label: "General Provisions",
    clauses: [
      {
        id: "governing-law",
        title: "Governing Law",
        content:
          "<h3>Governing Law</h3><p>This agreement is governed by and construed in accordance with the laws of the jurisdiction in which the facility operates, without regard to its conflict-of-law principles.</p>",
      },
      {
        id: "entire-agreement",
        title: "Entire Agreement",
        content:
          "<h3>Entire Agreement</h3><p>This document constitutes the entire agreement between the parties and supersedes all prior understandings, whether written or oral, relating to its subject matter.</p>",
      },
    ],
  },
];
