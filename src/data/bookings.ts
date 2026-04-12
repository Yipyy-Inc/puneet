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
    startDate: "2026-04-01",
    endDate: "2026-04-05",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    status: "confirmed",
    basePrice: 45,
    discount: 0,
    totalCost: 135,
    paymentStatus: "pending",
    kennel: "Kennel 3",
    specialRequests: "Buddy needs his blanket from home. Feed twice daily.",
    includesEvaluation: true,
    evaluationStatus: "pending",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "10001",
      status: "estimate",
      items: [
        {
          name: "Boarding — Standard (3 nights)",
          unitPrice: 45,
          quantity: 3,
          price: 135,
        },
        {
          name: "Video Call",
          unitPrice: 20,
          quantity: 1,
          price: 20,
          type: "addon",
          staffName: "Amy C.",
        },
        {
          name: "Enrichment Session",
          unitPrice: 15,
          quantity: 1,
          price: 15,
          type: "addon",
          staffName: "Jake M.",
        },
      ],
      fees: [],
      subtotal: 170,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 25.46,
      taxes: [
        { name: "GST", rate: 0.05, amount: 8.5 },
        { name: "QST", rate: 0.09975, amount: 16.96 },
      ],
      total: 195.46,
      depositCollected: 0,
      remainingDue: 195.46,
      payments: [],
    },
    feedingInstructions: [
      {
        id: "feed-1",
        label: "Breakfast",
        time: "08:00",
        amount: "1 cup",
        foodType: "Dry Kibble (Royal Canin)",
        instructions: "Mix with warm water, let sit 5 min before serving",
        status: "completed",
        feedback: "Ate all (100%)",
        completedBy: "Amy C.",
        completedAt: "2026-04-01T08:15:00Z",
      },
      {
        id: "feed-2",
        label: "Dinner",
        time: "18:00",
        amount: "1 cup",
        foodType: "Dry Kibble (Royal Canin)",
        instructions: "Add medication (Apoquel) to food",
        status: "pending",
      },
      {
        id: "feed-3",
        label: "Treats",
        time: "14:00",
        amount: "2 pieces",
        foodType: "Dental chews",
        status: "pending",
      },
    ],
    medicationInstructions: [
      {
        id: "med-1",
        name: "Apoquel",
        dosage: "16mg tablet",
        method: "Oral",
        frequency: "Once daily",
        times: ["08:00"],
        instructions: "Must be given with food, not on empty stomach",
        isCritical: true,
        doses: [
          {
            scheduledAt: "2026-04-01T08:00:00Z",
            status: "given",
            administeredBy: "Jessica M.",
            administeredAt: "2026-04-01T08:10:00Z",
          },
          {
            scheduledAt: "2026-04-02T08:00:00Z",
            status: "pending",
          },
          {
            scheduledAt: "2026-04-03T08:00:00Z",
            status: "pending",
          },
        ],
      },
      {
        id: "med-2",
        name: "Eye drops",
        dosage: "2 drops per eye",
        method: "Topical",
        frequency: "Twice daily",
        times: ["08:00", "20:00"],
        instructions: "Hold head gently, reward after",
        isCritical: false,
        doses: [
          {
            scheduledAt: "2026-04-01T08:00:00Z",
            status: "given",
            administeredBy: "Amy C.",
            administeredAt: "2026-04-01T08:20:00Z",
          },
          {
            scheduledAt: "2026-04-01T20:00:00Z",
            status: "pending",
          },
        ],
      },
    ],
    belongings: [
      {
        id: "bel-1",
        name: "Blue fleece blanket",
        description: "With stars pattern — Buddy's comfort item",
        photoUrl: "/dogs/dog-1.jpg",
        condition: "Good",
        checkedInAt: "2026-04-01T14:00:00Z",
        checkedInBy: "Front Desk",
        returned: false,
      },
      {
        id: "bel-2",
        name: "Red nylon leash",
        description: "Black clip, medium length",
        condition: "Good",
        checkedInAt: "2026-04-01T14:00:00Z",
        checkedInBy: "Front Desk",
        returned: false,
      },
      {
        id: "bel-3",
        name: "Food (own supply)",
        description: "Bag of Royal Canin, 2 cups per day",
        photoUrl: "/dogs/dog-2.jpg",
        condition: "Sealed",
        checkedInAt: "2026-04-01T14:00:00Z",
        checkedInBy: "Front Desk",
        returned: false,
      },
      {
        id: "bel-4",
        name: "Squeaky duck toy",
        description: "Yellow, favorite toy",
        condition: "Used",
        checkedInAt: "2026-04-01T14:00:00Z",
        checkedInBy: "Front Desk",
        returned: false,
      },
    ],
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
      id: "10002",
      status: "estimate",
      items: [
        {
          name: "Full Groom — Poodle Cut",
          unitPrice: 75,
          quantity: 1,
          price: 75,
          staffName: "Sarah K.",
        },
        {
          name: "Nail Trim",
          unitPrice: 15,
          quantity: 1,
          price: 15,
          type: "addon",
          staffName: "Sarah K.",
        },
      ],
      fees: [],
      subtotal: 90,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 13.48,
      taxes: [
        { name: "GST", rate: 0.05, amount: 4.5 },
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
      id: "10003",
      status: "open",
      items: [
        { name: "Daycare — Full Day", unitPrice: 50, quantity: 1, price: 50 },
        {
          name: "Premium Lunch Add-on",
          unitPrice: 8,
          quantity: 1,
          price: 8,
          type: "addon",
        },
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
      id: "10004",
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
        { name: "GST", rate: 0.05, amount: 2.5 },
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
      id: "10005",
      status: "closed",
      items: [
        {
          name: "Boarding — Deluxe Suite (3 nights)",
          unitPrice: 65,
          quantity: 3,
          price: 195,
        },
      ],
      fees: [],
      subtotal: 195,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 29.2,
      taxes: [
        { name: "GST", rate: 0.05, amount: 9.75 },
        { name: "QST", rate: 0.09975, amount: 19.45 },
      ],
      total: 224.2,
      depositCollected: 50,
      remainingDue: 0,
      payments: [
        {
          date: "2026-03-08",
          method: "card",
          amount: 50,
          transactionId: "DEP-7721",
        },
        {
          date: "2026-03-13",
          method: "card",
          amount: 174.2,
          transactionId: "TXN-7722",
        },
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
      id: "10006",
      status: "closed",
      items: [
        {
          name: "Full Groom",
          unitPrice: 65,
          quantity: 1,
          price: 65,
          staffName: "Jessica M.",
        },
        {
          name: "Ear Cleaning",
          unitPrice: 10,
          quantity: 1,
          price: 10,
          staffName: "Jessica M.",
          type: "addon",
        },
        {
          name: "Teeth Brushing",
          unitPrice: 12,
          quantity: 1,
          price: 12,
          staffName: "Amy C.",
          type: "addon",
        },
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
      payments: [
        {
          date: "2026-03-18",
          method: "card",
          amount: 100.03,
          transactionId: "TXN-8834",
        },
      ],
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
      id: "10007",
      status: "closed",
      items: [
        {
          name: "Private Training Session",
          unitPrice: 75,
          quantity: 1,
          price: 75,
        },
      ],
      fees: [],
      subtotal: 75,
      discount: 11.25,
      discountLabel: "Gold Membership 15%",
      discounts: [
        {
          name: "Gold Membership (15%)",
          unitPrice: 11.25,
          quantity: 1,
          price: 11.25,
          type: "discount",
          taxable: false,
        },
      ],
      taxRate: 0.14975,
      taxAmount: 9.55,
      taxes: [
        { name: "GST", rate: 0.05, amount: 3.19 },
        { name: "QST", rate: 0.09975, amount: 6.36 },
      ],
      total: 73.3,
      depositCollected: 0,
      remainingDue: 0,
      payments: [{ date: "2026-03-12", method: "cash", amount: 73.3 }],
      membershipApplied: "Gold — 15%",
    },
    quickbooksSync: {
      status: "synced",
      quickbooksInvoiceId: "QB-INV-1007",
      quickbooksCustomerId: "QB-CUST-15",
      lastSyncAt: "2026-03-12T15:45:00Z",
      history: [
        {
          action: "invoice_created",
          timestamp: "2026-03-12T14:00:00Z",
          quickbooksRefId: "QB-INV-1007",
          triggeredBy: "system",
        },
        {
          action: "payment_synced",
          timestamp: "2026-03-12T15:45:00Z",
          amount: 73.3,
          quickbooksRefId: "QB-PMT-8801",
          triggeredBy: "system",
        },
      ],
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
      id: "10008",
      status: "closed",
      items: [
        {
          name: "Aqua Therapy Pool — Swim Session",
          unitPrice: 25,
          quantity: 1,
          price: 25,
          type: "service",
          taxable: true,
          moduleId: "csm-yodas-splash",
        },
        {
          name: "Package credit (10 Swim Sessions — 6 remaining)",
          unitPrice: 20,
          quantity: 1,
          price: -20,
          type: "package_credit",
          taxable: false,
        },
      ],
      fees: [],
      subtotal: 5,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 0.75,
      taxes: [
        { name: "GST", rate: 0.05, amount: 0.25 },
        { name: "QST", rate: 0.09975, amount: 0.5 },
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
      id: "10009",
      status: "closed",
      items: [
        {
          name: "Aqua Therapy Pool — Swim Session",
          unitPrice: 25,
          quantity: 1,
          price: 25,
          type: "service",
          taxable: true,
          moduleId: "csm-yodas-splash",
          staffName: "Jake M.",
        },
      ],
      fees: [
        {
          name: "Tip (for Jake M.)",
          unitPrice: 5,
          quantity: 1,
          price: 5,
          type: "tip",
          taxable: false,
          staffName: "Jake M.",
        },
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
    quickbooksSync: {
      status: "failed",
      quickbooksInvoiceId: "QB-INV-1009",
      quickbooksCustomerId: "QB-CUST-15",
      lastSyncAt: "2026-03-22T16:30:00Z",
      error: "QuickBooks API timeout — please retry",
      history: [
        {
          action: "invoice_created",
          timestamp: "2026-03-22T16:00:00Z",
          quickbooksRefId: "QB-INV-1009",
          triggeredBy: "system",
        },
        {
          action: "sync_failed",
          timestamp: "2026-03-22T16:30:00Z",
          amount: 33.74,
          error: "QuickBooks API timeout — please retry",
          triggeredBy: "system",
        },
      ],
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
      id: "10010",
      status: "closed",
      items: [
        {
          name: "Paws Express — Pickup",
          unitPrice: 30,
          quantity: 1,
          price: 30,
          type: "service",
          taxable: true,
          moduleId: "csm-paws-express",
        },
      ],
      fees: [
        {
          name: "Fuel Surcharge",
          unitPrice: 5,
          quantity: 1,
          price: 5,
          type: "addon",
          taxable: true,
        },
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
      id: "10011",
      status: "closed",
      items: [
        {
          name: "Boarding — Premium (2 nights)",
          unitPrice: 65,
          quantity: 2,
          price: 130,
        },
      ],
      fees: [],
      subtotal: 130,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 130,
      depositCollected: 65,
      remainingDue: 0,
      payments: [
        {
          date: "2026-03-01",
          method: "card",
          amount: 65,
          transactionId: "DEP-9901",
        },
      ],
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
      id: "10012",
      status: "open",
      items: [{ name: "Bath & Brush", unitPrice: 45, quantity: 1, price: 45 }],
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
      id: "10013",
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
        { name: "GST", rate: 0.05, amount: 2.5 },
        { name: "QST", rate: 0.09975, amount: 4.99 },
      ],
      total: 57.49,
      depositCollected: 0,
      remainingDue: 0,
      payments: [{ date: "2026-03-24", method: "cash", amount: 60.0 }],
    },
    daycareSelectedDates: ["2026-03-24"],
    daycareDateTimes: [
      { date: "2026-03-24", checkInTime: "07:30", checkOutTime: "18:00" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // #14 — CLOSED: Split payment (card + cash)
  // Test: Multiple payment entries in history, split receipt
  // Client: Jane Smith (29), Pet: Fluffy
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 14,
    clientId: 29,
    petId: 14,
    facilityId: 11,
    service: "grooming",
    serviceType: "full_groom",
    startDate: "2026-03-17",
    endDate: "2026-03-17",
    checkInTime: "09:30",
    checkOutTime: "11:00",
    status: "completed",
    basePrice: 65,
    discount: 0,
    totalCost: 65,
    paymentStatus: "paid",
    stylistPreference: "Emily T.",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "10014",
      status: "closed",
      items: [
        {
          name: "Full Groom",
          unitPrice: 65,
          quantity: 1,
          price: 65,
          staffName: "Emily T.",
        },
        {
          name: "De-matting",
          unitPrice: 25,
          quantity: 1,
          price: 25,
          staffName: "Emily T.",
          type: "addon",
        },
      ],
      fees: [],
      subtotal: 90,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 13.48,
      taxes: [
        { name: "GST", rate: 0.05, amount: 4.5 },
        { name: "QST", rate: 0.09975, amount: 8.98 },
      ],
      total: 103.48,
      depositCollected: 0,
      remainingDue: 0,
      payments: [
        {
          date: "2026-03-17",
          method: "card",
          amount: 60.0,
          transactionId: "TXN-5501",
        },
        { date: "2026-03-17", method: "cash", amount: 43.48 },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #15 — CLOSED: Benefit stacking (package + membership + discount)
  // Test: All 3 benefits on one invoice, stacking order shown
  // Client: Alice Johnson (15), Pet: Whiskers — Gold member + package
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 15,
    clientId: 15,
    petId: 2,
    facilityId: 11,
    service: "boarding",
    serviceType: "deluxe",
    startDate: "2026-03-08",
    endDate: "2026-03-10",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    status: "completed",
    basePrice: 65,
    discount: 16.25,
    totalCost: 130,
    paymentStatus: "paid",
    kennel: "Suite B",
    notificationEmail: true,
    notificationSMS: false,
    invoice: {
      id: "10015",
      status: "closed",
      items: [
        {
          name: "Boarding — Deluxe (2 nights)",
          unitPrice: 65,
          quantity: 2,
          price: 130,
        },
      ],
      fees: [],
      subtotal: 130,
      discount: 16.25,
      discountLabel: "Stacked benefits",
      discounts: [
        {
          name: "Gold Membership (15%)",
          unitPrice: 19.5,
          quantity: 1,
          price: 19.5,
          type: "discount",
          taxable: false,
        },
        {
          name: "Promo: SPRING10 ($10 off)",
          unitPrice: 10,
          quantity: 1,
          price: 10,
          type: "discount",
          taxable: false,
        },
      ],
      taxRate: 0.14975,
      taxAmount: 15.05,
      taxes: [
        { name: "GST", rate: 0.05, amount: 5.03 },
        { name: "QST", rate: 0.09975, amount: 10.02 },
      ],
      total: 115.55,
      depositCollected: 0,
      remainingDue: 0,
      payments: [
        {
          date: "2026-03-10",
          method: "card",
          amount: 115.55,
          transactionId: "TXN-6601",
        },
      ],
      membershipApplied: "Gold — 15%",
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #16 — CLOSED: Partially refunded (2 of 3 items refunded)
  // Test: Refund receipt generated, original invoice preserved
  // Client: Bob Smith (16), Pet: Max
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 16,
    clientId: 16,
    petId: 3,
    facilityId: 11,
    service: "grooming",
    serviceType: "bath_brush",
    startDate: "2026-03-14",
    endDate: "2026-03-14",
    checkInTime: "10:00",
    checkOutTime: "11:00",
    status: "completed",
    basePrice: 45,
    discount: 0,
    totalCost: 45,
    paymentStatus: "paid",
    stylistPreference: "Mike R.",
    notificationEmail: true,
    notificationSMS: false,
    invoice: {
      id: "10016",
      status: "closed",
      items: [
        {
          name: "Bath & Brush",
          unitPrice: 45,
          quantity: 1,
          price: 45,
          staffName: "Mike R.",
        },
        {
          name: "Nail Trim (REFUNDED)",
          unitPrice: 15,
          quantity: 1,
          price: 15,
          staffName: "Mike R.",
          type: "addon",
        },
        {
          name: "Flea Treatment (REFUNDED)",
          unitPrice: 20,
          quantity: 1,
          price: 20,
          staffName: "Mike R.",
          type: "addon",
        },
      ],
      fees: [],
      subtotal: 80,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 11.98,
      taxes: [
        { name: "GST", rate: 0.05, amount: 4.0 },
        { name: "QST", rate: 0.09975, amount: 7.98 },
      ],
      total: 91.98,
      depositCollected: 0,
      remainingDue: 0,
      payments: [
        {
          date: "2026-03-14",
          method: "card",
          amount: 91.98,
          transactionId: "TXN-7701",
        },
        {
          date: "2026-03-16",
          method: "card",
          amount: -35.0,
          transactionId: "REF-7702",
        },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #17 — OPEN: Cash payment with tip added manually on invoice
  // Test: Add Tip on invoice panel, then proceed to cash checkout
  // Client: Bob Smith (16), Pet: Max
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 17,
    clientId: 16,
    petId: 3,
    facilityId: 11,
    service: "training",
    serviceType: "group_class",
    startDate: "2026-03-29",
    endDate: "2026-03-29",
    checkInTime: "16:00",
    checkOutTime: "17:00",
    status: "confirmed",
    basePrice: 40,
    discount: 0,
    totalCost: 40,
    paymentStatus: "pending",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "10017",
      status: "open",
      items: [
        { name: "Group Training Class", unitPrice: 40, quantity: 1, price: 40 },
      ],
      fees: [],
      subtotal: 40,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 5.99,
      taxes: [
        { name: "GST", rate: 0.05, amount: 2.0 },
        { name: "QST", rate: 0.09975, amount: 3.99 },
      ],
      total: 45.99,
      depositCollected: 0,
      remainingDue: 45.99,
      payments: [],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #18 — ESTIMATE SENT: Waiting for client confirmation
  // Test: Estimate banner, Resend/Confirm/Decline buttons, customer confirm flow
  // Client: Alice Johnson (15), Pet: Buddy
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 18,
    clientId: 15,
    petId: 1,
    facilityId: 11,
    service: "boarding",
    serviceType: "deluxe",
    startDate: "2026-04-19",
    endDate: "2026-04-30",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    status: "estimate_sent",
    basePrice: 65,
    discount: 0,
    totalCost: 715,
    paymentStatus: "pending",
    kennel: "Suite A",
    specialRequests:
      "Buddy needs his blanket from home. Extra walks in the afternoon please.",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "10018",
      status: "estimate",
      items: [
        {
          name: "Boarding — Deluxe Suite (11 nights)",
          unitPrice: 65,
          quantity: 11,
          price: 715,
        },
        {
          name: "Nail Trim",
          unitPrice: 15,
          quantity: 1,
          price: 15,
          type: "addon",
          staffName: "Sarah K.",
        },
        {
          name: "Video Call",
          unitPrice: 20,
          quantity: 1,
          price: 20,
          type: "addon",
          staffName: "Amy C.",
        },
        {
          name: "Gourmet Treats Pack",
          unitPrice: 12,
          quantity: 1,
          price: 12,
          type: "product",
        },
      ],
      fees: [],
      subtotal: 762,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 111.11,
      taxes: [
        { name: "GST", rate: 0.05, amount: 37.1 },
        { name: "QST", rate: 0.09975, amount: 74.01 },
      ],
      total: 853.11,
      depositCollected: 0,
      remainingDue: 853.11,
      payments: [],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #22 — MULTI-PET (2): Two pets daycare
  // Test: 2-pet side-by-side layout
  // Client: Alice Johnson (15), Pets: Buddy (1) + Whiskers (2)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 22,
    clientId: 15,
    petId: [1, 2],
    facilityId: 11,
    service: "daycare",
    serviceType: "full_day",
    startDate: "2026-04-22",
    endDate: "2026-04-22",
    checkInTime: "08:00",
    checkOutTime: "17:00",
    status: "confirmed",
    basePrice: 50,
    discount: 0,
    totalCost: 100,
    paymentStatus: "pending",
    specialRequests:
      "Keep Buddy and Whiskers in the same play group if possible.",
    notificationEmail: true,
    notificationSMS: false,
    invoice: {
      id: "10022",
      status: "open",
      items: [
        {
          name: "Daycare Full Day — Buddy",
          unitPrice: 50,
          quantity: 1,
          price: 50,
        },
        {
          name: "Daycare Full Day — Whiskers",
          unitPrice: 50,
          quantity: 1,
          price: 50,
        },
      ],
      fees: [],
      subtotal: 100,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 14.98,
      taxes: [
        { name: "GST", rate: 0.05, amount: 5.0 },
        { name: "QST", rate: 0.09975, amount: 9.98 },
      ],
      total: 114.98,
      depositCollected: 0,
      remainingDue: 114.98,
      payments: [],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #19 — MULTI-PET: Three pets boarding together
  // Test: 3-pet grid layout, per-pet feeding/medication labels
  // Client: Alice Johnson (15), Pets: Buddy (1) + Whiskers (2) + Daisy (50)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 19,
    clientId: 15,
    petId: [1, 2, 50],
    facilityId: 11,
    service: "boarding",
    serviceType: "standard",
    startDate: "2026-04-01",
    endDate: "2026-04-04",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    status: "confirmed",
    basePrice: 45,
    discount: 0,
    totalCost: 270,
    paymentStatus: "pending",
    kennel: "Kennel 5 + Kennel 6",
    specialRequests:
      "Buddy and Whiskers can share playtime but feed separately.",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "10019",
      status: "open",
      items: [
        {
          name: "Boarding — Standard (3 nights) — Buddy",
          unitPrice: 45,
          quantity: 3,
          price: 135,
        },
        {
          name: "Boarding — Standard (3 nights) — Whiskers",
          unitPrice: 45,
          quantity: 3,
          price: 135,
        },
        {
          name: "Boarding — Standard (3 nights) — Daisy",
          unitPrice: 45,
          quantity: 3,
          price: 135,
        },
      ],
      fees: [],
      subtotal: 405,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 40.43,
      taxes: [
        { name: "GST", rate: 0.05, amount: 13.5 },
        { name: "QST", rate: 0.09975, amount: 26.93 },
      ],
      total: 310.43,
      depositCollected: 0,
      remainingDue: 310.43,
      payments: [],
    },
    feedingInstructions: [
      {
        id: "feed-m1",
        label: "Buddy — Breakfast",
        time: "08:00",
        amount: "1 cup",
        foodType: "Dry Kibble (Royal Canin)",
        instructions: "Mix with warm water",
        status: "pending",
      },
      {
        id: "feed-m2",
        label: "Whiskers — Breakfast",
        time: "08:00",
        amount: "1/2 cup",
        foodType: "Wet Food (Fancy Feast)",
        instructions: "Serve at room temperature",
        status: "pending",
      },
      {
        id: "feed-m3",
        label: "Buddy — Dinner",
        time: "18:00",
        amount: "1 cup",
        foodType: "Dry Kibble (Royal Canin)",
        status: "pending",
      },
      {
        id: "feed-m4",
        label: "Whiskers — Dinner",
        time: "18:00",
        amount: "1/2 cup",
        foodType: "Wet Food (Fancy Feast)",
        status: "pending",
      },
      {
        id: "feed-m5",
        label: "Daisy — Breakfast",
        time: "08:00",
        amount: "1/4 cup",
        foodType: "Dry Kibble (Small Breed)",
        instructions: "Small portions — she eats fast and may choke",
        status: "pending",
      },
      {
        id: "feed-m6",
        label: "Daisy — Dinner",
        time: "18:00",
        amount: "1/4 cup",
        foodType: "Dry Kibble (Small Breed)",
        status: "pending",
      },
    ],
    medicationInstructions: [
      {
        id: "med-m1",
        name: "Buddy — Apoquel",
        dosage: "16mg tablet",
        method: "Oral",
        frequency: "Once daily",
        times: ["08:00"],
        instructions: "Give with food",
        isCritical: true,
        doses: [
          { scheduledAt: "2026-04-01T12:00:00Z", status: "pending" },
          { scheduledAt: "2026-04-02T08:00:00Z", status: "pending" },
          { scheduledAt: "2026-04-03T08:00:00Z", status: "pending" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // #20 — MULTI-PET (4): Four pets daycare
  // Test: 4-pet grid layout
  // Client: John Doe (28), Pets: Rex (13) + Bella (19) + Whiskers (20) + Shadow (21)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 20,
    clientId: 28,
    petId: [13, 19, 20, 21],
    facilityId: 11,
    service: "daycare",
    serviceType: "full_day",
    startDate: "2026-04-21",
    endDate: "2026-04-21",
    checkInTime: "07:30",
    checkOutTime: "18:00",
    status: "confirmed",
    basePrice: 40,
    discount: 0,
    totalCost: 160,
    paymentStatus: "pending",
    specialRequests:
      "Shadow is shy — keep separate from large groups. Rex and Bella can play together.",
    notificationEmail: true,
    notificationSMS: false,
    invoice: {
      id: "10020",
      status: "open",
      items: [
        {
          name: "Daycare Full Day — Rex",
          unitPrice: 40,
          quantity: 1,
          price: 40,
        },
        {
          name: "Daycare Full Day — Bella",
          unitPrice: 40,
          quantity: 1,
          price: 40,
        },
        {
          name: "Daycare Full Day — Whiskers",
          unitPrice: 40,
          quantity: 1,
          price: 40,
        },
        {
          name: "Daycare Full Day — Shadow",
          unitPrice: 40,
          quantity: 1,
          price: 40,
        },
      ],
      fees: [],
      subtotal: 160,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 23.96,
      taxes: [
        { name: "GST", rate: 0.05, amount: 8.0 },
        { name: "QST", rate: 0.09975, amount: 15.96 },
      ],
      total: 183.96,
      depositCollected: 0,
      remainingDue: 183.96,
      payments: [],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // #21 — MULTI-PET (5): Five pets boarding — full house
  // Test: 5-pet grid layout, responsive wrapping
  // Client: John Doe (28), All 5 pets
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 21,
    clientId: 28,
    petId: [13, 19, 20, 21, 51],
    facilityId: 11,
    service: "boarding",
    serviceType: "standard",
    startDate: "2026-05-01",
    endDate: "2026-05-04",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    status: "confirmed",
    basePrice: 45,
    discount: 0,
    totalCost: 675,
    paymentStatus: "pending",
    kennel: "Kennels 1-5",
    specialRequests:
      "Mochi is an escape artist — double check all gates. Shadow needs a quiet kennel away from dogs.",
    notificationEmail: true,
    notificationSMS: true,
    invoice: {
      id: "10021",
      status: "open",
      items: [
        {
          name: "Boarding Standard (3 nights) — Rex",
          unitPrice: 45,
          quantity: 3,
          price: 135,
        },
        {
          name: "Boarding Standard (3 nights) — Bella",
          unitPrice: 45,
          quantity: 3,
          price: 135,
        },
        {
          name: "Boarding Standard (3 nights) — Whiskers",
          unitPrice: 45,
          quantity: 3,
          price: 135,
        },
        {
          name: "Boarding Standard (3 nights) — Shadow",
          unitPrice: 45,
          quantity: 3,
          price: 135,
        },
        {
          name: "Boarding Standard (3 nights) — Mochi",
          unitPrice: 45,
          quantity: 3,
          price: 135,
        },
      ],
      fees: [],
      subtotal: 675,
      discount: 0,
      taxRate: 0.14975,
      taxAmount: 101.08,
      taxes: [
        { name: "GST", rate: 0.05, amount: 33.75 },
        { name: "QST", rate: 0.09975, amount: 67.33 },
      ],
      total: 776.08,
      depositCollected: 0,
      remainingDue: 776.08,
      payments: [],
    },
  },
];
