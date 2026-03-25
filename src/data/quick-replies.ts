// ========================================
// QUICK REPLY TEMPLATES
// ========================================

export type QuickReplyCategory = "general" | "booking" | "payment" | "support";

export interface QuickReplyTemplate {
  name: string;
  body: string;
  category: QuickReplyCategory;
}

export const quickReplyTemplates: QuickReplyTemplate[] = [
  {
    name: "Greeting",
    body: "Hi {{customer_first_name}}! Thanks for reaching out to {{facility_name}}. How can we help you and {{pet_name}} today?",
    category: "general",
  },
  {
    name: "Hours & Location",
    body: "Our hours are Mon-Fri 7AM-7PM, Sat 8AM-5PM. We're located at {{facility_address}}. See you soon!",
    category: "general",
  },
  {
    name: "Booking Confirmed",
    body: "Great news! {{pet_name}}'s {{service_name}} is confirmed for {{booking_date}} at {{booking_time}}. Details: {{booking_details_link}}",
    category: "booking",
  },
  {
    name: "Payment Reminder",
    body: "Hi {{customer_first_name}}, just a reminder that invoice {{invoice_id}} for {{amount_due}} is due on {{due_date}}. Pay here: {{payment_link}}",
    category: "payment",
  },
];
