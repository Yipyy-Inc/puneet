// Help-center / FAQ content surfaced in the Support drawer. This is seed data;
// the live build feeds from the Knowledge Base admin (Task 57).

export interface HelpArticle {
  id: string;
  category: string;
  title: string;
  answer: string;
}

export const helpArticles: HelpArticle[] = [
  {
    id: "ha-1",
    category: "Getting Started",
    title: "How do I add a new staff member?",
    answer:
      "Go to Staff → Add Staff, enter their name and role, and send the invitation. They'll receive an email to set up their account.",
  },
  {
    id: "ha-2",
    category: "Getting Started",
    title: "How do I set my business hours?",
    answer:
      "Open Settings → Hours of Operation and set opening/closing times per day. These hours drive online booking availability.",
  },
  {
    id: "ha-3",
    category: "Bookings & Scheduling",
    title: "How do I create a booking for a walk-in?",
    answer:
      "From the Dashboard or Calendar, click New Booking, search for the client (or add a new one), pick the service and time, then confirm.",
  },
  {
    id: "ha-4",
    category: "Bookings & Scheduling",
    title: "Can clients book online themselves?",
    answer:
      "Yes. Share your booking link from Settings → Online Booking. Clients pick a service and time from your live availability.",
  },
  {
    id: "ha-5",
    category: "Bookings & Scheduling",
    title: "How do I handle a no-show?",
    answer:
      "Open the booking and set its status to No-Show. You can optionally apply a no-show fee if one is configured for that service.",
  },
  {
    id: "ha-6",
    category: "Payments & Invoicing",
    title: "How do I take a payment?",
    answer:
      "Open the booking or client, click Charge, choose card or cash, and complete the payment. A receipt is emailed automatically.",
  },
  {
    id: "ha-7",
    category: "Payments & Invoicing",
    title: "How do I issue a refund?",
    answer:
      "Find the payment under Billing → Payments, open it, and click Refund. Partial and full refunds are supported.",
  },
  {
    id: "ha-8",
    category: "Payments & Invoicing",
    title: "Where do I update my subscription plan?",
    answer:
      "Subscription changes are managed by Yipyy. Submit a ticket from this drawer and our team will adjust your plan.",
  },
  {
    id: "ha-9",
    category: "Clients & Pets",
    title: "How do I merge duplicate client profiles?",
    answer:
      "Open one of the duplicates, click the menu, and choose Merge. Select the profile to merge into — history is preserved.",
  },
  {
    id: "ha-10",
    category: "Clients & Pets",
    title: "How do I record a pet's vaccination records?",
    answer:
      "Open the pet profile, go to the Health tab, and add the vaccination with its expiry date. You'll be alerted before it lapses.",
  },
  {
    id: "ha-11",
    category: "Account Settings",
    title: "How do I reset my password?",
    answer:
      "Sign out and click Forgot Password on the login screen, or ask an admin to send you a reset link from Staff.",
  },
  {
    id: "ha-12",
    category: "Account Settings",
    title: "How do I enable notifications?",
    answer:
      "Go to Settings → Notifications and toggle email, SMS, and in-app alerts for bookings, payments, and reminders.",
  },
];
