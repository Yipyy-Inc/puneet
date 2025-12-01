# **Doggieville MTL — Detailed Specifications (Markdown Version)**

_Structured by view, with thorough checklists._

---

Below is the **Platform Admin (Super Admin)** section rewritten as a **clean, structured checklist**, with every item tagged as:

- 🟢 Existing (in original SRS)
- 🟠 Extended (in original SRS but expanded in new spec)
- 🟡 New (only appears in the new Super Admin spec)

---

# ✅ **Platform Admin (Super Admin) — Checklist (Merged + Tagged)**

---

## **Purpose & Users**

- [ ] 🟢 Platform operators manage tenants, billing, system configuration
- [ ] 🟡 Internal sales, support, auditors, and account managers included as users

---

# **1. Screens / Components**

## **Global Dashboard**

- [x] 🟠 System-wide KPIs (tenants, bookings, revenue, uptime)
- [x] 🟡 Active users count (staff + customers)
- [x] 🟠 Performance charts (revenue, growth, reservations trends)
- [x] 🟡 Customer acquisition trends
- [x] 🟡 Top/bottom facility performance
- [x] 🟡 Quick actions (add facility, view activities, open tickets, send announcements)

---

## **Tenant Management**

- [x] 🟢 Tenant list with search & filters
- [x] 🟠 Filters by plan, location, active/inactive status
- [x] 🟡 Search by owner name, phone number
- [x] 🟢 Activate, suspend, delete tenant
- [x] 🟡 Archive closed facilities

---

## **Tenant Detail View**

- [x] 🟠 Basic tenant profile (existing) + enhanced usage data
- [x] 🟠 Staff count, user count, storage, subscription info
- [ ] 🟡 Staff utilization rate
- [ ] 🟡 Customer & reservation growth analytics
- [ ] 🟡 Module usage breakdown
- [x] 🟠 Activity logs & audit logs per tenant

---

## **Subscription & Plan Editor**

- [x] 🟢 Edit plans/features per tenant
- [x] 🟠 Multi-tier pricing (Beginner, Pro, Enterprise)
- [x] 🟠 Feature flags per tier
- [x] 🟡 Module-specific pricing
- [x] 🟡 Usage limits (reservations, storage, staff count)
- [x] 🟠 Upgrade/downgrade management

---

## **Billing & Payments Console**

- [x] 🟢 View facility invoices & billing history
- [x] 🟠 Refunds, adjustments, manual credits
- [x] 🟡 Payment provider analytics (success rate, failure rate)
- [x] 🟡 Multi-currency support
- [x] 🟡 Transaction logs & reconciliation tools
- [x] 🟡 Gateway-level performance dashboard

---

## **Global Settings**

- [x] 🟢 Branding defaults
- [x] 🟢 Supported languages/currency
- [x] 🟢 System-wide defaults
- [ ] 🟡 Advanced integration options (email, SMS, messaging platforms)

---

## **Compliance & Data Tools**

- [x] 🟢 GDPR export/delete
- [x] 🟠 Data retention policies
- [x] 🟠 Backups + manual export
- [ ] 🟡 Backup verification
- [ ] 🟡 Point-in-time recovery
- [ ] 🟡 Disaster recovery workflows
- [ ] 🟡 Selective data restoration

---

## **Support & Ticketing**

- [x] 🟢 View/assign tickets
- [x] 🟠 Priorities & SLAs
- [x] 🟠 Ticket history & timeline
- [ ] 🟡 Real-time chat support
- [ ] 🟡 Multiple concurrent chats
- [ ] 🟡 Feature request tracking

---

## **Feature Toggles / Remote Config**

- [x] 🟢 Enable/disable modules per tenant
- [x] 🟠 Remote config flags applied instantly
- [ ] 🟡 Module upgrade/downgrade analytics

---

## **Audit Logs & Security**

- [x] 🟢 Log all admin actions
- [x] 🟠 Resource-level log indexing
- [ ] 🟡 Impersonation session logs
- [ ] 🟡 Security event logging (failed logins, suspicious activity)
- [ ] 🟡 Financial change audits

---

## **Alerts & Incident Dashboard**

- [ ] 🟡 Critical error notifications
- [ ] 🟡 Performance degradation alerts
- [ ] 🟡 Capacity warnings
- [ ] 🟡 Configurable alert thresholds
- [ ] 🟡 Escalation rules & notification channels

---

## **Promotions & Discounts Console**

- [x] 🟡 Create system-wide or facility-specific promo codes
- [x] 🟡 Time-limited campaigns
- [x] 🟡 Percentage, fixed, bundle, or first-time offers
- [x] 🟡 Redemption limits
- [x] 🟡 Promo effectiveness analytics (ROI, conversion rate)

---

## **CRM & Sales Pipeline**

- [x] 🟡 Lead capture (facility name, owner, size, service type)
- [x] 🟡 Pipeline stages (New → Demo → Proposal → Negotiation → Won/Lost)
- [x] 🟡 Drag-and-drop pipeline UI
- [x] 🟡 Deal tracking (tier, modules, value, close date)
- [x] 🟡 Sales activity logging (calls, emails, tasks)
- [x] 🟡 Follow-up reminders & task assignment
- [x] 🟡 Sales analytics (conversion rates, time-to-close, rep performance)
- [x] 🟡 One-click conversion → create facility account
- [x] 🟡 Onboarding checklist for new facilities

---

# **2. Key Workflows**

- [x] 🟢 Create / suspend / delete tenant
- [ ] 🟢 Approve tenant signups
- [x] 🟠 Configure plan & features (now more complex)
- [ ] 🟠 Backup/restore tenant data
- [ ] 🟠 Manage support tickets & SLAs
- [ ] 🟡 Impersonate facility admin for support
- [ ] 🟡 Send system-wide announcements
- [x] 🟡 Manage promo campaigns
- [x] 🟡 Convert sales lead → facility account
- [x] 🟡 Configure payment providers per facility

---

# **3. Acceptance Criteria**

- [x] 🟢 Tenant creation & onboarding works end-to-end
- [ ] 🟢 Feature toggles immediately reflect at tenant level
- [ ] 🟢 All admin actions logged immutably
- [ ] 🟡 Impersonation logs show session start, end, and actions
- [x] 🟡 Promo codes track usage and conversion
- [x] 🟡 Sales pipeline supports full lead → onboarding workflow
- [ ] 🟡 Alerts fire when thresholds are crossed
- [x] 🟡 Payment analytics correctly reflect failures & retries

---

# **4. Security**

- [ ] 🟢 Super Admin–only access
- [ ] 🟢 Mandatory MFA
- [ ] 🟢 Immutable audit logs
- [ ] 🟡 IP whitelisting
- [ ] 🟡 Session policy enforcement
- [ ] 🟡 Suspicious activity monitoring
- [ ] 🟡 Compliance-level data retention & purge automation

---

# **2. Facility (Business / Tenant) Admin Panel**

## **Users**

- Owner
- Manager
- Front Desk
- Staff (Groomer, Trainer)
- Custom Roles via RBAC

---

## **1. Dashboard**

- [x] 🟢 Today's arrivals & departures cards
- [x] 🟢 One-click Check-In / Check-Out wizard
- [ ] 🟡 QR scan option from customer profile for fast check-in
- [ ] 🟡 Prearrival check-in system (parents fill feeding, medication, items details before arrival)
- [x] 🟠 Quick-action bar (New Booking, New Customer, Take Payment)
- [x] 🟠 Universal search (booking id, email, customer name, pet name)

---

## **2. Kennel View**

- [x] 🟠 Visual grid (colour: vacant / occupied / reserved / maintenance)
- [ ] 🟡 Timeline row per kennel
- [ ] 🟡 Drag pet to move kennel
- [ ] 🟡 Block / unblock kennels
- [x] 🟠 Extend / shorten stay inline with recalculation & charge
- [ ] 🟡 Customizable room/feature names per facility in Settings

---

## **3. Customers & Pets**

### Customer Management

- [x] 🟢 Searchable list of customer files
- [ ] 🟡 Merge duplicates
- [ ] 🟡 Import CSV
- [x] 🟢 Customer profiles: contact info, email, phone, address
- [x] 🟢 Pets linked to customer
- [x] 🟢 Booking history
- [x] 🟢 Docs / agreements storage
- [x] 🟠 Communications log (unified view)
- [x] 🟠 Call history with recordings
- [ ] 🟡 Staff interaction log (who they spoke to)
- [x] 🟠 Quick buttons: Book, Message, Charge, Apply Credit

### Pet Management

- [x] 🟢 Searchable pet profiles list
- [x] 🟠 Pet photo gallery
- [x] 🟠 Vaccinations with auto-expiry reminder (to facility AND parents)
- [x] 🟢 Medical / diet / behaviour info
- [x] 🟢 Stay history
- [x] 🟢 Report cards
- [ ] 🟡 Badge wall for pets
- [x] 🟢 Vaccination PDF upload & reminder push

### Behaviour Tags (Staff-Only, Internal)

- [ ] 🟡 Master tag list in Settings → Pet Settings → Behaviour Tags
- [ ] 🟡 Each tag = name + colour (hex) + icon
- [ ] 🟡 Default starter set: Barker, Mounting, Food Aggressive, Escape Artist, Shy/Nervous, High Energy, Senior/Fragile, Medication Required
- [ ] 🟡 Assign unlimited tags per pet (multi-select chips)
- [ ] 🟡 Tags display as coloured pills on pet profile
- [ ] 🟡 Auto-print on Boarding Card, Daily Care Sheet, Check-in modal, Appointment cards
- [ ] 🟡 Smart warnings during check-in (e.g., "Food Aggressive" → suggest solitary kennel)
- [ ] 🟡 Smart warnings during play-group assignment
- [ ] 🟡 Filter Kennel View by tag
- [ ] 🟡 Reports → Behaviour Tags summary (count per tag, per stay, per facility)
- [ ] 🟡 Permissions: only "Edit Pet" role can add/remove tags

---

## **4. Staff**

### 4.1 Directory

- [x] 🟢 Add / edit staff profiles
- [x] 🟢 Roles & certifications
- [x] 🟠 Document storage for staff
- [ ] 🟡 Emergency contact info

### 4.2 Scheduling

- [x] 🟢 Calendar view (day / week / month)
- [x] 🟠 Shift templates & copy-paste
- [x] 🟢 Recurring shifts
- [x] 🟢 Availability grid + time-off request flow (approve / deny)
- [ ] 🟡 Shift-swap request (manager approve)
- [ ] 🟡 AI suggester: reads upcoming reservations & recommends head-count per shift
- [ ] 🟠 Auto-scheduler: respects availability, max hours, labour budget vs revenue
- [x] 🟠 Staff hourly rates / salary for cost vs labour reports
- [ ] 🟠 Real-time change push (30-min reminder)
- [ ] 🟡 Sick-alert broadcast
- [ ] 🟡 Open-shift pickup
- [x] 🟢 ICS feed export (Phase 2)

### 4.3 Tasks

- [x] 🟢 Task templates (boarding, daycare, cleaning, medication)
- [x] 🟠 Shift tasks (assigned to particular shifts, customizable)
- [x] 🟢 Assign to shift or pet; set priority & photo-proof flag
- [x] 🟠 Repeat patterns (daily, weekly, custom)
- [x] 🟠 Completion = staff initials + ID + timestamp

### 4.4 Performance

- [ ] 🟡 Shift feedback after every shift (staff → manager) with notification
- [x] 🟠 Task completion rate per employee

### 4.5 Training & Loyalty

- [ ] 🟡 Training video library; mark complete
- [ ] 🟡 Assign training to new employees (watch videos, read content, take exams)
- [ ] 🟡 Employee birthday notifications (customizable recipients)
- [ ] 🟡 Points / rewards for covering shifts, perfect attendance
- [ ] 🟡 Manager / owner can grant rewards

---

## **5. Services & Pricing**

- [x] 🟢 Service catalog (boarding, daycare, grooming, training, extras)
- [x] 🟢 Packages & add-ons
- [x] 🟢 Size-based pricing
- [x] 🟢 Seasonal pricing
- [x] 🟢 Peak-surcharge rules
- [x] 🟠 Dynamic pricing engine (demand & occupancy driven)
- [x] 🟢 Memberships & prepaid credits
- [x] 🟢 Discount / promo code manager

---

## **6. Payments & Billing**

- [x] 🟢 Take payment: card (Stripe)
- [x] 🟢 Cash payments
- [x] 🟢 Saved card
- [ ] 🟡 Split payments
- [x] 🟢 Gift cards (online)
- [x] 🟠 Gift cards (offline / physical)
- [x] 🟢 Customer credit / prepaid credits
- [x] 🟢 Deposits & refunds
- [x] 🟢 Auto-invoice from booking
- [x] 🟢 Recurring invoices for memberships
- [x] 🟠 Outstanding balance list
- [x] 🟠 Auto-reminder for outstanding balances
- [x] 🟢 Tips support

---

## **7. Reports & Analytics**

- [x] 🟢 KPI tile row (bookings, occupancy %, AOV, retention)
- [x] 🟢 Pre-built reports: occupancy, no-show, cancellation
- [x] 🟠 Pre-built reports: labour cost
- [x] 🟢 Pre-built reports: top customers / client lifetime value
- [x] 🟠 Custom report builder (drag fields, filter, schedule email)
- [x] 🟢 Export CSV / PDF
- [x] 🟠 Export Excel
- [ ] 🟡 Printables section (Daily Care Sheets, Boarding Cards for bulk print)

---

## **8. Marketing**

### 8.1 Email & SMS Campaigns

- [x] 🟢 Template library
- [x] 🟢 Segment builder
- [x] 🟠 A/B testing
- [x] 🟢 Schedule campaigns
- [x] 🟠 Track opens / clicks

### 8.2 Loyalty & Referrals

- [x] 🟢 Points per $ spent
- [x] 🟠 Tier rules
- [x] 🟢 Referral codes
- [x] 🟢 Auto-reward
- [x] 🟠 Badge engine (customizable milestones / discounts per facility)

### 8.3 Promotions

- [x] 🟢 Create promo codes
- [x] 🟢 Usage limits
- [x] 🟠 Auto-apply rules

### 8.4 Paid-Ads Tracking

- [ ] 🟡 Google / Meta pixel integration
- [ ] 🟡 ROI dashboard

---

## **9. Communications**

### 9.1 Messaging Hub

- [x] 🟢 Unified inbox (email, SMS, in-app)
- [x] 🟢 Templates & file attach
- [x] 🟠 Per-customer communication history view

### 9.2 Automations

- [x] 🟢 Booking confirmation
- [x] 🟢 24-hour reminder
- [x] 🟢 Check-in / out notice
- [x] 🟢 Payment receipt
- [x] 🟢 Vaccination expiry
- [x] 🟢 Grooming / training appointment reminder

### 9.3 Real-Time Pet Updates

- [x] 🟠 One-tap buttons: "Eating now", "Potty break", "Play time", "Nap time" → pushes to owner
- [x] 🟢 Push notifications to owner

### 9.4 AI Receptionist / Calling

- [x] 🟠 Call log
- [x] 🟠 Recording
- [x] 🟠 Voicemail
- [x] 🟠 Routing rules
- [x] 🟠 AI takes bookings over phone
- [ ] 🟡 AI tour booking

### 9.5 Internal Comms

- [ ] 🟡 Manager announcements
- [ ] 🟡 Shift hand-over notes
- [x] 🟢 @mentions

---

## **10. Daycare Module (Opt-In)**

- [x] 🟢 Daycare dashboard (current count, capacity bar)
- [ ] 🟠 Timers
- [x] 🟢 Quick check-in / out with timer start / stop
- [ ] 🟡 Play-group creator (size / temperament)
- [x] 🟢 Hourly, half-day, full-day rates
- [x] 🟢 Packages
- [x] 🟢 Daily report card auto-emailed (activities, meals, photos)

---

## **11. Boarding Module (Opt-In)**

### Core Features

- [x] 🟢 Boarding dashboard (current guests, arrivals, departures)
- [x] 🟢 Nightly rates
- [x] 🟢 Multi-night discounts
- [x] 🟢 Peak surcharge
- [x] 🟢 Per-pet feeding schedule & tracker
- [x] 🟠 Appetite notes on feeding (ate-all / left-some / refused)
- [x] 🟢 Medication schedule & tracker (dose ✓ + initials)
- [x] 🟠 Photo proof on medication
- [ ] 🟡 Kennel-clean checklist & blocker flag
- [x] 🟢 Stay extension wizard
- [x] 🟠 Early checkout wizard

### Daily Care Sheet

- [x] 🟡 Auto-generated at check-in; lives digitally for whole stay
- [x] 🟠 Tracks feedings: time, food type, portion, ate-all / left-some / refused
- [x] 🟠 Tracks medications: time, dose, given-by initials, photo proof toggle
- [x] 🟡 Tracks potty breaks: time, ✓ / accident notes
- [x] 🟡 Tracks walks: time, duration, staff initials
- [x] 🟡 Tracks playtime: group or solo, start/end, notes
- [x] 🟡 Staff update via phone or kiosk → timestamps locked
- [x] 🟡 One-click "Print Today" or "Print Stay Summary" (PDF, fits clipboard)

### Boarding Card / Kennel Card (Prints to Hang on Gate)

- [x] 🟡 Auto-generates when kennel assigned
- [x] 🟡 Contains: Pet photo (colour), pet name, breed, sex, weight, colour/markings
- [x] 🟡 Owner names + primary phone
- [x] 🟡 Check-in / check-out dates
- [x] 🟡 Allergy icon + list
- [x] 🟡 Medication icon + short schedule
- [x] 🟡 Feeding instructions (food brand, amount, times)
- [x] 🟡 Emergency vet contact
- [x] 🟡 QR code (links to full digital sheet)
- [ ] 🟡 Template editor in Settings → Boarding → Kennel Card Layout
- [x] 🟡 Re-print anytime (replacement card or updated info)

---

## **12. Grooming Module (Opt-In)**

- [x] 🟢 Grooming calendar (online booking enabled)
- [x] 🟢 Stylist assignment & availability
- [ ] 🟡 Style preference gallery (owner uploads reference photo)
- [ ] 🟡 Progress tracker: Check-in → Bath → Dry → Haircut → Finish → Pick-up
- [ ] 🟡 Real-time push + photo at each stage
- [x] 🟠 Before / after photo album per visit
- [x] 🟢 Grooming packages
- [x] 🟠 Product inventory

---

## **13. Training Module (Opt-In)**

- [x] 🟢 Class schedule & capacity
- [x] 🟢 Enrollment
- [ ] 🟡 Wait-list
- [ ] 🟡 Private session booking
- [x] 🟢 Trainer notes
- [ ] 🟡 Homework assignment
- [x] 🟢 Progress tracker
- [ ] 🟡 Skill badges
- [ ] 🟡 Certificate auto-generation
- [x] 🟢 Packages
- [ ] 🟡 Drop-in billing

---

## **14. Retail / POS (Opt-In)**

- [ ] 🟢 POS screen (barcode scan, cart, discounts, split tender, print / email receipt)
- [ ] 🟢 Product catalog with variants & stock toggle
- [ ] 🟢 Inventory dashboard (stock value, low-stock alert, movement log)
- [ ] 🟢 Low stock push notification to manager / staff
- [ ] 🟢 Purchase orders & supplier list
- [ ] 🟢 Online store sync (if enabled)

---

## **15. Incident Reporting**

- [ ] 🟢 Create incident (type, severity, pets, staff, description, photos)
- [ ] 🟢 Manager notification & follow-up tasks
- [ ] 🟢 Incident history per pet
- [ ] 🟢 Closed-loop marker
- [ ] 🟢 Internal vs client-facing notes
- [ ] 🟢 Severity levels & permissions

---

## **16. Settings**

### Business Configuration

- [ ] 🟢 Business profile, hours, locations, branding
- [ ] 🟢 Booking rules, cancel policy, deposit %, capacity limits
- [ ] 🟠 Kennel map, types, amenities (visual map)
- [ ] 🟢 Pet size classes, vaccination rules

### Financial

- [ ] 🟢 Payment gateway, tax rates, currency
- [ ] 🟢 Roles & permissions matrix
- [ ] 🟠 Financial data lock-down

### Notifications

- [ ] 🟢 Notification toggles & template editor

### Integrations

- [ ] 🟢 SMS, email SMTP
- [ ] 🟠 VOIP
- [ ] 🟢 QuickBooks (Phase 2)
- [ ] 🟢 AI tools
- [ ] 🟡 Ads manager (Google, Facebook)
- [ ] 🟡 Partnerships tab (pet insurance referral link / banner)

### Subscription

- [ ] 🟢 Subscription & module add-ons view

### Audit

- [ ] 🟢 Audit log for every setting change (who changed what, when, exportable)

---

## **17. Additional Features**

- [ ] 🟡 QR code generation for each pet (wallet-size tag / app screen, scan at check-in/out)
- [ ] 🟡 Pet-Collar Printer Integration (print bright temporary ID bands at check-in)
  - Works with PetDetect or thermal printers (1" or 1.5" collar media)
  - Pet name & owner last name (large text)
  - Coloured stripe = care-alert level (Red = medication/special notes, Amber = senior/special needs, Blue = behaviour tag, Green = standard)
  - Small icons: feeding schedule, meds, escape-risk, diet
  - Facility logo + phone (repeats every 6")
  - Auto-choose collar length (12", 18", 24", 30") based on stored pet size
- [ ] 🟠 Reminder for grooming / vet appointments (separate from boarding)
- [ ] 🟡 Customer community forum (pet-parents board, anonymised, with moderation queue)
- [ ] 🟡 OTA performance reviews (Google / Yelp pull-in, reply inline)
- [ ] 🟢 Live PetCam Integration (link live camera feeds for clients to view pets)
- [ ] 🟢 Mobile App White-Label Option
- [ ] 🟢 Smart Insights Dashboard (AI-driven)
- [ ] 🟢 Digital Waivers & E-Signatures
- [ ] 🟢 AI Recommendations at checkout ("Add nail trim?" upsell)
- [ ] 🟢 Conflict detection for double-booked staff

---

## **Opt-In Modules (Managed by Super Admin)**

- SMS module
- Calling module
- Email marketing module
- AI receptionist module
- Staff scheduling module
- Daycare module
- Boarding module
- Grooming module
- Training module
- Retail / POS module

---

## **Key Workflows**

- [ ] 🟢 Setup services & pricing
- [ ] 🟢 Publish available services to client portal
- [ ] 🟢 Create / modify bookings
- [ ] 🟢 Check-in / out workflow (with QR option)
- [ ] 🟢 Manage CRM & pet medical records
- [ ] 🟢 Handle incidents with follow-up tasks
- [ ] 🟡 Prearrival check-in flow (parents complete before arrival)
- [ ] 🟡 Daily care sheet updates via mobile / kiosk
- [ ] 🟡 Play-group assignment with smart warnings
- [ ] 🟡 Shift-swap approval workflow
- [ ] 🟡 Staff training assignment & completion tracking

---

## **Acceptance Criteria**

- [ ] 🟢 Capacity rules must prevent overbooking
- [ ] 🟢 Staff conflicts must be detected unless override exists
- [ ] 🟢 Vaccine reminders triggered automatically (to facility AND parents)
- [ ] 🟢 Full booking lifecycle test
- [ ] 🟢 Shift conflict tests
- [ ] 🟢 Vaccine reminder tests
- [ ] 🟡 Behaviour tags display correctly on all relevant screens
- [ ] 🟡 Smart warnings fire during check-in for tagged pets
- [ ] 🟡 Daily care sheet timestamps are locked after staff submission
- [ ] 🟡 Kennel cards print with all required fields
- [ ] 🟡 Real-time pet updates push within 5 seconds

---

# **3. Staff Views (Front Desk, Groomer/Trainer, Manager)**

## **Screens**

- Front Desk Quick Panel
- Groomer/Trainer Agenda
- Manager Controls (approvals, staff roster, performance)

## **Key Workflows**

- Quick booking creation
- Fast check-in/out
- Daily task completion
- Photo uploads for report cards

## **Acceptance Criteria**

- Check-in/out should be achievable in < 3 clicks
- Staff should only see data allowed by their role

---

### **Staff Checklist**

- [ ] Role-specific dashboards
- [ ] Mobile-friendly quick actions
- [ ] Photo uploads + compression
- [ ] Internal messaging with mentions
- [ ] Mobile incident report submission

---

# **4. Client (Pet Owner) Portal — Web, Mobile, PWA**

## **Screens / Components**

- Home & My Pets
- Full booking flow
- Pet Health Vault
- Booking history
- Messaging with facility
- Report cards (photos & notes)
- Wallet & payments
- Loyalty points
- Notification center
- Account settings

## **Key Workflows**

- Search facility → choose service → pick time → pay → confirmation
- Upload vaccine documents
- Receive push/email notifications
- View daily report cards

## **Acceptance Criteria**

- One-tap rebook restores previous options
- Vaccine upload triggers reminder monitoring
- Push notifications fall back to email if unavailable

---

### **Client Checklist**

#### **Booking Flow**

- [ ] Real-time availability API
- [ ] Stripe payments + saved cards
- [ ] Deposit support

#### **Pets & Health**

- [ ] Pet profile editing
- [ ] Vaccine upload + expiry tracking
- [ ] Report cards view

#### **UX Enhancements**

- [ ] Smart booking assistant
- [ ] Loyalty points system

#### **Notifications**

- [ ] Push within 5 seconds
- [ ] Email fallback

---

# **5. Public Website & Demo Sandbox**

## **Checklist**

- [ ] Marketing website (features, pricing, FAQ)
- [ ] Self-serve signup
- [ ] 30-day trial flow
- [ ] Demo sandbox with auto-generated data

---

# **6. API, Webhooks & Integrations**

## **APIs**

- REST/GraphQL for tenants, locations, bookings, clients, pets, invoices, etc.

## **Webhooks**

- booking.created / updated / cancelled
- payment.succeeded / refunded
- pet.vaccine.expiring
- message.created

## **Integrations**

- Stripe
- PayPal (optional)
- Firebase/APNs
- SMS (Twilio)
- Accounting (QuickBooks/Xero — Phase 2)

---

### **API / Integration Checklist**

- [ ] API key management (create, rotate, revoke)
- [ ] Webhook management UI
- [ ] Retry logic + delivery logs
- [ ] SDK or Postman collection

---

# **7. Data Model & Multi-Tenancy**

## **Core Entities**

- Tenant, Location, User, Role
- Service, Resource, Booking
- Client, Pet, VaccineRecord
- Invoice, Payment, Message
- Notification, File, AuditLog

## **Strategy**

- PostgreSQL row-level security (RLS)
- Tenant ID enforced at DB & API layer

---

### **Multi-Tenancy Checklist**

- [ ] RLS policies implemented & tested
- [ ] Per-tenant backup & restore
- [ ] Isolation tests (cross-tenant access blocked)

---

# **8. Non-Functional Requirements**

## **Performance**

- P95 < 2.5 seconds at 1k concurrent sessions

## **Security**

- OAuth2/OIDC
- JWT access tokens
- AES-256 at rest
- TLS 1.2+

## **Availability**

- 99.9% uptime
- Multi-AZ deployment
- Daily backups (14-day retention)

## **Accessibility**

- WCAG 2.1 AA
- Bilingual EN/FR

---

### **NFR Checklist**

- [ ] OAuth2/OIDC auth completed
- [ ] JWT session management
- [ ] Encryption at rest & in transit
- [ ] Secrets manager integration
- [ ] Daily backups + DR strategy
- [ ] Logging + monitoring + alerts

---

# **9. MVP Scope (Phase 1)**

## **Includes**

- Tenancy basics
- Facility setup & services
- Daycare & boarding booking engine
- Check-in/out
- CRM + vaccine reminders
- Stripe payments
- Reports
- EN/FR UI
- Audit log

---

### **MVP Checklist**

- [ ] Tenant onboarding + sample data
- [ ] Services CRUD
- [ ] Booking engine (daycare/boarding)
- [ ] Calendar with capacity rules
- [ ] Check-in/out
- [ ] CRM (clients, pets)
- [ ] Vaccine reminders
- [ ] Stripe integration
- [ ] Basic reporting
- [ ] EN/FR translations

---

# **10. Acceptance Criteria Matrix (Short Version)**

- [ ] Booking is atomic & prevents oversell
- [ ] Staff schedule conflict detection works
- [ ] Push notification fallback logic works
- [ ] Vaccine reminders are accurate
