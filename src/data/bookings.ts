import type { Booking } from "@/types/booking";

export const bookings: Booking[] = [
  // ═══════════════════════════════════════════════════════════════════
  // #1 — ESTIMATE: Deposit required, no payment yet
  // Test: Blue deposit banner, View Estimate, Charge Deposit button
  // Client: Alice Johnson (15), Pet: Buddy
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 1,
    clientId: 15,
    petId: 1,
    facilityId: 11,
    service: "boarding",
    serviceType: "standard",
    startDate: "2026-04-15",
    endDate: "2026-04-18",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    status: "pending",
    basePrice: 45,
    discount: 0,
    totalCost: 135,
    paymentStatus: "pending",
    kennel: "Kennel 3",
    specialRequests: "Buddy needs his blanket from home. Feed twice daily.",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "INV-1001",
      status: "estimate",
      items: [
        { name: "Boarding — Standard (3 nights)", unitPrice: 45, quantity: 3, price: 135 },
      ],
      fees: [],
      subtotal: 135,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 20.22,
      taxes: [
        { name: "GST", rate: 0.05, amount: 6.75 },
        { name: "QST", rate: 0.09975, amount: 13.47 },
      ],
      total: 155.22,
      depositCollected: 0,
      remainingDue: 155.22,
      payments: [],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #2 — ESTIMATE + DEPOSIT PAID: Awaiting check-in
  // Test: Green deposit banner, Continue to Check In, auto-confirm
  // Client: John Doe (28), Pet: Bella (Border Collie)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 2,
    clientId: 28,
    petId: 19,
    facilityId: 11,
    service: "grooming",
    serviceType: "full_groom",
    startDate: "2026-04-05",
    endDate: "2026-04-05",
    checkInTime: "10:00",
    checkOutTime: "11:30",
    status: "confirmed",
    basePrice: 75,
    discount: 0,
    totalCost: 75,
    paymentStatus: "pending",
    stylistPreference: "Sarah K.",
    specialRequests: "Poodle cut, gentle on paws — anxious dog",
    notificationEmail: true,
    notificationSMS: false,
    invoice: {
      id: "INV-1002",
      status: "estimate",
      items: [
        { name: "Full Groom — Poodle Cut", unitPrice: 75, quantity: 1, price: 75, staffName: "Sarah K." },
        { name: "Nail Trim", unitPrice: 15, quantity: 1, price: 15, type: "addon", staffName: "Sarah K." },
      ],
      fees: [],
      subtotal: 90,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 13.48,
      taxes: [
        { name: "GST", rate: 0.05, amount: 4.50 },
        { name: "QST", rate: 0.09975, amount: 8.98 },
      ],
      total: 103.48,
      depositCollected: 45,
      remainingDue: 58.48,
      payments: [{ date: "2026-04-01", method: "card", amount: 45 }],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #3 — OPEN INVOICE: Checked in, editable items + fees
  // Test: Edit/delete line items on hover, Add Fee, Add Product, Discount
  // Client: Alice Johnson (15), Pet: Whiskers (Cat)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 3,
    clientId: 15,
    petId: 2,
    facilityId: 11,
    service: "daycare",
    serviceType: "full_day",
    startDate: "2026-03-30",
    endDate: "2026-03-30",
    checkInTime: "08:00",
    checkOutTime: "17:00",
    status: "confirmed",
    basePrice: 50,
    discount: 0,
    totalCost: 50,
    paymentStatus: "pending",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "INV-1003",
      status: "open",
      items: [
        { name: "Daycare — Full Day", unitPrice: 50, quantity: 1, price: 50 },
        { name: "Premium Lunch Add-on", unitPrice: 8, quantity: 1, price: 8, type: "addon" },
      ],
      fees: [
        { name: "Late Pickup Fee", unitPrice: 15, quantity: 1, price: 15 },
      ],
      subtotal: 73,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 10.93,
      taxes: [
        { name: "GST", rate: 0.05, amount: 3.65 },
        { name: "QST", rate: 0.09975, amount: 7.28 },
      ],
      total: 83.93,
      depositCollected: 0,
      remainingDue: 83.93,
      payments: [],
    },
    daycareSelectedDates: ["2026-03-30"],
    daycareDateTimes: [
      { date: "2026-03-30", checkInTime: "08:00", checkOutTime: "17:00" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // #4 — UNPAID COMPLETED: Pending payment (bulk payment candidate)
  // Test: Proceed to Checkout, Finish Without Payment, bulk payment banner
  // Client: John Doe (28), Pet: Rex
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 4,
    clientId: 28,
    petId: 13,
    facilityId: 11,
    service: "daycare",
    serviceType: "full_day",
    startDate: "2026-03-25",
    endDate: "2026-03-25",
    checkInTime: "08:00",
    checkOutTime: "17:00",
    status: "completed",
    basePrice: 50,
    discount: 0,
    totalCost: 50,
    paymentStatus: "pending",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "INV-1004",
      status: "open",
      items: [
        { name: "Daycare — Full Day", unitPrice: 50, quantity: 1, price: 50 },
      ],
      fees: [],
      subtotal: 50,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 7.49,
      taxes: [
        { name: "GST", rate: 0.05, amount: 2.50 },
        { name: "QST", rate: 0.09975, amount: 4.99 },
      ],
      total: 57.49,
      depositCollected: 0,
      remainingDue: 57.49,
      payments: [],
    },
    daycareSelectedDates: ["2026-03-25"],
    daycareDateTimes: [
      { date: "2026-03-25", checkInTime: "08:00", checkOutTime: "17:00" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // #5 — CLOSED: Paid by card, no tip (locked state)
  // Test: Finished banner, locked invoice, Issue Refund, View Receipt
  // Client: Jane Smith (29), Pet: Fluffy (Cat)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 5,
    clientId: 29,
    petId: 14,
    facilityId: 11,
    service: "boarding",
    serviceType: "deluxe",
    startDate: "2026-03-10",
    endDate: "2026-03-13",
    checkInTime: "15:00",
    checkOutTime: "11:00",
    status: "completed",
    basePrice: 65,
    discount: 0,
    totalCost: 195,
    paymentStatus: "paid",
    kennel: "Suite A",
    notificationEmail: true,
    notificationSMS: false,
    invoice: {
      id: "INV-1005",
      status: "closed",
      items: [
        { name: "Boarding — Deluxe Suite (3 nights)", unitPrice: 65, quantity: 3, price: 195 },
      ],
      fees: [],
      subtotal: 195,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 29.20,
      taxes: [
        { name: "GST", rate: 0.05, amount: 9.75 },
        { name: "QST", rate: 0.09975, amount: 19.45 },
      ],
      total: 224.20,
      depositCollected: 50,
      remainingDue: 0,
      payments: [
        { date: "2026-03-08", method: "card", amount: 50, transactionId: "DEP-7721" },
        { date: "2026-03-13", method: "card", amount: 174.20, transactionId: "TXN-7722" },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #6 — CLOSED WITH TIP + MULTI-STAFF: Tip splitting scenario
  // Test: Split Tips modal, View Receipt with tip distribution
  // Client: John Doe (28), Pet: Whiskers (Cat)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 6,
    clientId: 28,
    petId: 20,
    facilityId: 11,
    service: "grooming",
    serviceType: "full_groom",
    startDate: "2026-03-18",
    endDate: "2026-03-18",
    checkInTime: "09:00",
    checkOutTime: "11:00",
    status: "completed",
    basePrice: 65,
    discount: 0,
    totalCost: 65,
    paymentStatus: "paid",
    stylistPreference: "Jessica M.",
    notificationEmail: true,
    notificationSMS: false,
    invoice: {
      id: "INV-1006",
      status: "closed",
      items: [
        { name: "Full Groom", unitPrice: 65, quantity: 1, price: 65, staffName: "Jessica M." },
        { name: "Ear Cleaning", unitPrice: 10, quantity: 1, price: 10, staffName: "Jessica M.", type: "addon" },
        { name: "Teeth Brushing", unitPrice: 12, quantity: 1, price: 12, staffName: "Amy C.", type: "addon" },
      ],
      fees: [],
      subtotal: 87,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 13.03,
      taxes: [
        { name: "GST", rate: 0.05, amount: 4.35 },
        { name: "QST", rate: 0.09975, amount: 8.68 },
      ],
      total: 100.03,
      depositCollected: 0,
      remainingDue: 0,
      payments: [{ date: "2026-03-18", method: "card", amount: 100.03, transactionId: "TXN-8834" }],
      tipTotal: 15,
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #7 — CLOSED WITH DISCOUNT + MEMBERSHIP: Loyalty discount applied
  // Test: Discount line, membership badge on invoice, cash payment
  // Client: Alice Johnson (15), Pet: Buddy — Gold member
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 7,
    clientId: 15,
    petId: 1,
    facilityId: 11,
    service: "training",
    serviceType: "private_session",
    startDate: "2026-03-12",
    endDate: "2026-03-12",
    checkInTime: "14:00",
    checkOutTime: "15:00",
    status: "completed",
    basePrice: 75,
    discount: 11.25,
    totalCost: 63.75,
    paymentStatus: "paid",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "INV-1007",
      status: "closed",
      items: [
        { name: "Private Training Session", unitPrice: 75, quantity: 1, price: 75 },
      ],
      fees: [],
      subtotal: 75,
      discount: 11.25,
      discountLabel: "Gold Membership 15%",
      discounts: [
        { name: "Gold Membership (15%)", unitPrice: 11.25, quantity: 1, price: 11.25, type: "discount", taxable: false },
      ],
      taxRate: 0.14975,
      taxAmount: 9.55,
      taxes: [
        { name: "GST", rate: 0.05, amount: 3.19 },
        { name: "QST", rate: 0.09975, amount: 6.36 },
      ],
      total: 73.30,
      depositCollected: 0,
      remainingDue: 0,
      payments: [{ date: "2026-03-12", method: "cash", amount: 73.30 }],
      membershipApplied: "Gold — 15%",
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #8 — CLOSED WITH PACKAGE CREDIT: Swim session using package
  // Test: Package credit line on invoice, reduced payment
  // Client: Alice Johnson (15), Pet: Buddy — has 10 Swim Sessions pkg
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 8,
    clientId: 15,
    petId: 1,
    facilityId: 11,
    service: "yodas-splash",
    serviceType: "timed_session",
    startDate: "2026-03-20",
    endDate: "2026-03-20",
    checkInTime: "10:00",
    checkOutTime: "10:45",
    status: "completed",
    basePrice: 25,
    discount: 0,
    totalCost: 25,
    paymentStatus: "paid",
    notificationEmail: true,
    notificationSMS: false,
    invoice: {
      id: "INV-1008",
      status: "closed",
      items: [
        { name: "Aqua Therapy Pool — Swim Session", unitPrice: 25, quantity: 1, price: 25, type: "service", taxable: true, moduleId: "csm-yodas-splash" },
        { name: "Package credit (10 Swim Sessions — 6 remaining)", unitPrice: 20, quantity: 1, price: -20, type: "package_credit", taxable: false },
      ],
      fees: [],
      subtotal: 5,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 0.75,
      taxes: [
        { name: "GST", rate: 0.05, amount: 0.25 },
        { name: "QST", rate: 0.09975, amount: 0.50 },
      ],
      total: 5.75,
      depositCollected: 0,
      remainingDue: 0,
      payments: [{ date: "2026-03-20", method: "card", amount: 5.75 }],
      packageCreditsUsed: 1,
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #9 — CUSTOM MODULE: Yoda's Splash with tip
  // Test: Custom module invoice, tip line, GST+QST breakdown
  // Client: Alice Johnson (15), Pet: Buddy
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 9,
    clientId: 15,
    petId: 1,
    facilityId: 11,
    service: "yodas-splash",
    serviceType: "timed_session",
    startDate: "2026-03-22",
    endDate: "2026-03-22",
    checkInTime: "14:00",
    checkOutTime: "14:45",
    status: "completed",
    basePrice: 25,
    discount: 0,
    totalCost: 25,
    paymentStatus: "paid",
    specialRequests: "First time swimming — go easy",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "INV-1009",
      status: "closed",
      items: [
        { name: "Aqua Therapy Pool — Swim Session", unitPrice: 25, quantity: 1, price: 25, type: "service", taxable: true, moduleId: "csm-yodas-splash", staffName: "Jake M." },
      ],
      fees: [
        { name: "Tip (for Jake M.)", unitPrice: 5, quantity: 1, price: 5, type: "tip", taxable: false, staffName: "Jake M." },
      ],
      subtotal: 25,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 3.74,
      taxes: [
        { name: "GST", rate: 0.05, amount: 1.25 },
        { name: "QST", rate: 0.09975, amount: 2.49 },
      ],
      total: 33.74,
      depositCollected: 0,
      remainingDue: 0,
      payments: [{ date: "2026-03-22", method: "card", amount: 33.74 }],
      tipTotal: 5,
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #10 — CUSTOM MODULE: Paws Express with fuel surcharge
  // Test: Transport invoice, fuel surcharge fee, per-route pricing
  // Client: John Doe (28), Pet: Rex
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 10,
    clientId: 28,
    petId: 13,
    facilityId: 11,
    service: "paws-express",
    serviceType: "transport",
    startDate: "2026-03-15",
    endDate: "2026-03-15",
    checkInTime: "07:30",
    checkOutTime: "08:15",
    status: "completed",
    basePrice: 30,
    discount: 0,
    totalCost: 30,
    paymentStatus: "paid",
    specialRequests: "Pickup from 123 Main St, buzz #42",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "INV-1010",
      status: "closed",
      items: [
        { name: "Paws Express — Pickup", unitPrice: 30, quantity: 1, price: 30, type: "service", taxable: true, moduleId: "csm-paws-express" },
      ],
      fees: [
        { name: "Fuel Surcharge", unitPrice: 5, quantity: 1, price: 5, type: "addon", taxable: true },
      ],
      subtotal: 35,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 5.24,
      taxes: [
        { name: "GST", rate: 0.05, amount: 1.75 },
        { name: "QST", rate: 0.09975, amount: 3.49 },
      ],
      total: 40.24,
      depositCollected: 0,
      remainingDue: 0,
      payments: [{ date: "2026-03-15", method: "card", amount: 40.24 }],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #11 — CANCELLED: No-show, deposit forfeited
  // Test: Cancelled status, deposit kept as no-show fee, reason shown
  // Client: John Doe (28), Pet: Bella
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 11,
    clientId: 28,
    petId: 19,
    facilityId: 11,
    service: "boarding",
    serviceType: "premium",
    startDate: "2026-03-05",
    endDate: "2026-03-07",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    status: "cancelled",
    basePrice: 65,
    discount: 0,
    totalCost: 130,
    paymentStatus: "pending",
    cancellationReason: "No-show — deposit of $65 forfeited as no-show fee",
    notificationEmail: true,
    notificationSMS: false,
    invoice: {
      id: "INV-1011",
      status: "closed",
      items: [
        { name: "Boarding — Premium (2 nights)", unitPrice: 65, quantity: 2, price: 130 },
      ],
      fees: [],
      subtotal: 130,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 130,
      depositCollected: 65,
      remainingDue: 0,
      payments: [{ date: "2026-03-01", method: "card", amount: 65, transactionId: "DEP-9901" }],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #12 — UNPAID: Second bulk payment candidate for client 28
  // Test: Shows in bulk payment banner when checking out booking #4
  // Client: John Doe (28), Pet: Shadow (Cat)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 12,
    clientId: 28,
    petId: 21,
    facilityId: 11,
    service: "grooming",
    serviceType: "bath_brush",
    startDate: "2026-03-27",
    endDate: "2026-03-27",
    checkInTime: "11:00",
    checkOutTime: "12:00",
    status: "completed",
    basePrice: 45,
    discount: 0,
    totalCost: 45,
    paymentStatus: "pending",
    notificationEmail: true,
    notificationSMS: false,
    invoice: {
      id: "INV-1012",
      status: "open",
      items: [
        { name: "Bath & Brush", unitPrice: 45, quantity: 1, price: 45 },
      ],
      fees: [],
      subtotal: 45,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 6.74,
      taxes: [
        { name: "GST", rate: 0.05, amount: 2.25 },
        { name: "QST", rate: 0.09975, amount: 4.49 },
      ],
      total: 51.74,
      depositCollected: 0,
      remainingDue: 51.74,
      payments: [],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #13 — CLOSED: Cash payment with store credit from change
  // Test: Paid in cash, overpaid, change kept as store credit
  // Client: Jane Smith (29), Pet: Max (Golden Retriever)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 13,
    clientId: 29,
    petId: 22,
    facilityId: 11,
    service: "daycare",
    serviceType: "full_day",
    startDate: "2026-03-24",
    endDate: "2026-03-24",
    checkInTime: "07:30",
    checkOutTime: "18:00",
    status: "completed",
    basePrice: 50,
    discount: 0,
    totalCost: 50,
    paymentStatus: "paid",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "INV-1013",
      status: "closed",
      items: [
        { name: "Daycare — Full Day", unitPrice: 50, quantity: 1, price: 50 },
      ],
      fees: [],
      subtotal: 50,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 7.49,
      taxes: [
        { name: "GST", rate: 0.05, amount: 2.50 },
        { name: "QST", rate: 0.09975, amount: 4.99 },
      ],
      total: 57.49,
      depositCollected: 0,
      remainingDue: 0,
      payments: [{ date: "2026-03-24", method: "cash", amount: 60.00 }],
    },
    daycareSelectedDates: ["2026-03-24"],
    daycareDateTimes: [
      { date: "2026-03-24", checkInTime: "07:30", checkOutTime: "18:00" },
    ],
  },
];
