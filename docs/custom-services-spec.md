# Custom Service Modules — Requirements Specification

> Reference: [Live App](https://puneet-blue.vercel.app/facility/dashboard/)

---

## 1. Overview

Build a **Custom Module Framework** that allows facilities to create fully custom services (e.g., pool bookings, chauffeur pickup, puppy social hour, birthday packages, therapy sessions) that behave as **first-class service types** — not secondary add-ons.

Custom modules must integrate natively with: booking, scheduling & availability, staff task management, coverage heatmap, kennel/lodging view, check-in/check-out, billing & invoicing, memberships & packages, YipyyGo PreCheck, reports & analytics, and the customer portal sidebar.

---

## 2. Module Categories

| Category | Description | Example |
|----------|-------------|---------|
| **Timed Session** | Fixed or variable-duration bookings | Pool session (30/60 min) |
| **Stay-Based** | Multi-day, may require room/kennel | Boarding extension suite |
| **Transport** | Route-based with capacity limits | Chauffeur pickup/drop-off |
| **Event-Based** | One-off or recurring group events | Birthday Pawty Package |
| **Add-On Only** | Cannot be standalone; linked to another service | Nail trim (with grooming only) |
| **One-Time Appointment** | Single scheduled appointment | Therapy session |

---

## 3. Module Creation Wizard (Admin Side)

### 3.1 Step 1 — Basic Information

| Field | Description | Required |
|-------|-------------|----------|
| Module Name | Display name (e.g., "Yoda's Splash") | Yes |
| Icon | Choose from icon library or upload | Yes |
| Category | One of the 6 categories above | Yes |
| Description | Shown on customer portal | Yes |
| Internal Notes | Staff-only, not visible to clients | No |

### 3.2 Step 2 — Operational Configuration

The wizard presents **6 configuration sections** (A–F) based on the selected category.

---

#### A) Calendar & Availability

> *Does this module require calendar-based scheduling?*

| Setting | Options | Notes |
|---------|---------|-------|
| Enabled | Yes / No | — |
| Booking type | Time-based slots | — |
| Duration options | Fixed (single) / Variable (multiple) | e.g., 30 / 60 / 90 min |
| Buffer time | Minutes between bookings | e.g., 15 min |
| Max simultaneous bookings | Integer | Per time slot |
| Assigned to | Room / Resource / Staff / Combination | e.g., Pool Room, Van #1 |

---

#### B) Check-In / Check-Out

> *Does this module require check-in/check-out tracking?*

| Setting | Options | Notes |
|---------|---------|-------|
| Enabled | Yes / No | — |
| Check-in type | Manual / Auto (at booking time) | — |
| Check-out time tracking | Yes / No | — |
| QR code support | Yes / No | — |

| Example | Check-In Required? | Notes |
|---------|-------------------|-------|
| Pool session | Yes | Manual check-in |
| Chauffeur | Yes | Pickup + drop-off status tracking |
| Birthday Party | Yes | — |
| Add-on nail trim | No | Linked to grooming session |

---

#### C) Stay-Based Configuration

> *Is this module multi-day / stay-based?*

| Setting | Options | Notes |
|---------|---------|-------|
| Enabled | Yes / No | — |
| Requires room/kennel assignment | Yes / No | — |
| Affects kennel view | Yes / No | — |
| Generates daily tasks | Yes / No | — |

---

#### D) Online Booking

> *Can customers book this online?*

| Setting | Options | Notes |
|---------|---------|-------|
| Enabled | Yes / No | — |
| Eligible clients | All / Approved only / Active members only | — |
| Approval required | Yes / No | — |
| Max dogs per session | Integer | — |
| Cancellation policy | Configurable | — |
| Deposit required | Yes / No | Amount configurable |

---

#### E) Pricing Model

| Model | Description | Example |
|-------|-------------|---------|
| Flat rate | Single fixed price | $25 per session |
| Duration-based | Price varies by time | $25/30min, $40/60min |
| Per pet | Per-animal pricing | $15 per dog |
| Per booking | One price per booking | $200 party package |
| Per route | Route-based pricing | $30 per pickup route |
| Dynamic pricing | Peak / off-peak rates | Weekend premium |
| Add-on only | Cannot be standalone | Linked to parent service |

---

#### F) Staff Assignment Rules

| Setting | Options | Notes |
|---------|---------|-------|
| Auto-assign staff | Yes / No | — |
| Required role | Groomer / Trainer / Driver / Pool Staff / Custom | — |
| Task generation | Setup / Execution / Cleanup | One or more |

---

## 4. System Integration Points

Once created, a custom module must integrate across **8 areas** of the platform.

### 4.1 Customer Portal

#### Sidebar

- If enabled, module appears in left sidebar (position configurable)
- If appointment-based only, appears inside "Book a Service" flow instead

#### Booking Flow

Custom modules follow the **same booking flow** as daycare/grooming:

```
Step 1: Select Pet
Step 2: Select Service (includes custom modules)
Step 3: Choose Date/Time (if calendar-based)
Step 4: Add Notes
Step 5: Payment / Deposit
Step 6: Confirmation
```

### 4.2 Facility Dashboard

| Integration | Details |
|-------------|---------|
| Upcoming bookings | Custom module bookings appear alongside core services |
| Check-in panel | Grouped with Boarding, Daycare, Custom Services |
| Status filters | Not Checked-In / In Progress / Completed |

### 4.3 Scheduling & Heatmap

If module requires staff or resource allocation:

- Appears in the scheduling grid
- Affects staffing coverage heatmap
- Blocks resource availability

| Example | Effect |
|---------|--------|
| Pool session booked | Pool resource blocked, assigned staff marked busy, heatmap updated |
| Chauffeur route booked | Van resource blocked, driver marked unavailable |

### 4.4 Kennel / Room View

If module is stay-related or resource-based:

- Toggle to show custom service indicators on kennel cards
- Example: Dog boarding + pool session booked → kennel card shows "Pool @ 2:00 PM"

### 4.5 Task Generation Engine

Each module can generate **automatic tasks** linked to bookings.

| Example Module | Generated Tasks |
|----------------|-----------------|
| Pool Session | Prepare pool (15 min before), Supervise session, Clean pool area |
| Chauffeur | Pickup at 8:00 AM, Drop-off at 6:00 PM |

**Task requirements:**
- Appear in staff mobile app
- Link to the originating booking
- Markable as complete

### 4.6 Billing & Invoicing

Custom modules must:

- Generate invoice line items
- Support: tax rules, discounts, memberships, packages, tips (if allowed)
- Appear in: invoices, receipts, revenue reporting

### 4.7 YipyyGo PreCheck Integration

Facility chooses whether module requires YipyyGo (`Yes / No`).

| Example | YipyyGo Sections |
|---------|-----------------|
| Pool session | Waiver confirmation, Belongings checklist, Towel provided? |
| Chauffeur | Pickup instructions, Emergency contact confirmation |

System must allow **module-specific YipyyGo sections**.

### 4.8 Reporting & Analytics

Custom modules must appear in:

| Report | Metric Example |
|--------|---------------|
| Revenue breakdown | Revenue per custom module |
| Service performance | "Yoda's Splash — 72 sessions this month" |
| Utilization rates | "Pool utilization 85%" |
| Staff time impact | Hours allocated per module |

---

## 5. Advanced Configuration

### 5.1 Conditional Logic

Module fields/availability can change based on:

| Condition | Example |
|-----------|---------|
| Pet type | Pool only for dogs |
| Membership status | Members-only pricing |
| Evaluation status | Pool requires swim evaluation passed |
| Other booked services | Add-on only available with parent service |
| Waiver status | Pool requires signed waiver |

### 5.2 Module Dependencies

| Dependency Type | Description | Example |
|-----------------|-------------|---------|
| Requires another service | Cannot book standalone | Pool only available if boarding |
| Add-on only | Must attach to parent service | Nail trim only with grooming |

### 5.3 Capacity & Resource Management

| Feature | Description |
|---------|-------------|
| Slot limits | Max bookings per time slot |
| Shared resources | Multiple modules can share a resource |
| Waitlists | Auto-waitlist when capacity full |

---

## 6. Example Configurations

### 6.1 Yoda's Splash (Pool Session)

| Setting | Value |
|---------|-------|
| Category | Timed Session |
| Duration | 30 / 60 min |
| Calendar | Required |
| Check-in/out | Required |
| Online booking | Enabled |
| Resource | Pool |
| Staff role | Pool Staff |
| Tasks | Setup, Supervise, Cleanup |
| YipyyGo | Waiver required |
| Pricing | Duration-based, membership discount eligible |

**System effects:** Sidebar entry, booking flow, pool resource blocked, staff heatmap, task generation, check-in dashboard, invoicing, YipyyGo integration.

### 6.2 Chauffeur Pickup Service

| Setting | Value |
|---------|-------|
| Category | Transport |
| Calendar | Required |
| Booking type | Route-based |
| Capacity | 4 dogs per route |
| Check-in/out | Required (pickup + drop-off status) |
| Resource | Van |
| Staff role | Driver |
| Tasks | Pickup, Drop-off |

**System effects:** Booking flow, driver availability blocked, route view, route sheet generation, invoicing, dashboard pickup status.

---

## 7. Architecture Direction

Custom modules must be:

- **Service-type objects** in the database (not hard-coded)
- **Configurable service schema** (dynamic fields per module)
- Connected to all core engines:

| Engine | Integration |
|--------|-------------|
| Booking engine | Slots, availability, reservations |
| Scheduling engine | Staff assignment, heatmap |
| Resource engine | Room/resource allocation, capacity |
| Billing engine | Line items, tax, discounts, packages |
| Task engine | Auto-generated tasks per booking |
| Reporting engine | Revenue, utilization, performance |
