# **Doggieville MTL — Detailed Specifications (Markdown Version)**

*Structured by view, with thorough checklists.*

---
Below is the **Platform Admin (Super Admin)** section rewritten as a **clean, structured checklist**, with every item tagged as:

* **🟢 Existing** (in original SRS)
* **🟠 Extended** (in original SRS but expanded in new spec)
* **🟡 New** (only appears in the new Super Admin spec)

---

# ✅ **Platform Admin (Super Admin) — Checklist (Merged + Tagged)**

---

## **Purpose & Users**

* [ ] 🟢 Platform operators manage tenants, billing, system configuration
* [ ] 🟡 Internal sales, support, auditors, and account managers included as users

---

# **1. Screens / Components**

## **Global Dashboard**

* [ ] 🟠 System-wide KPIs (tenants, bookings, revenue, uptime)
* [ ] 🟡 Active users count (staff + customers)
* [ ] 🟠 Performance charts (revenue, growth, reservations trends)
* [ ] 🟡 Customer acquisition trends
* [ ] 🟡 Top/bottom facility performance
* [ ] 🟡 Quick actions (add facility, view activities, open tickets, send announcements)

---

## **Tenant Management**

* [ ] 🟢 Tenant list with search & filters
* [ ] 🟠 Filters by plan, location, active/inactive status
* [ ] 🟡 Search by owner name, phone number
* [ ] 🟢 Activate, suspend, delete tenant
* [ ] 🟡 Archive closed facilities

---

## **Tenant Detail View**

* [ ] 🟠 Basic tenant profile (existing) + enhanced usage data
* [ ] 🟠 Staff count, user count, storage, subscription info
* [ ] 🟡 Staff utilization rate
* [ ] 🟡 Customer & reservation growth analytics
* [ ] 🟡 Module usage breakdown
* [ ] 🟠 Activity logs & audit logs per tenant

---

## **Subscription & Plan Editor**

* [ ] 🟢 Edit plans/features per tenant
* [ ] 🟠 Multi-tier pricing (Beginner, Pro, Enterprise)
* [ ] 🟠 Feature flags per tier
* [ ] 🟡 Module-specific pricing
* [ ] 🟡 Usage limits (reservations, storage, staff count)
* [ ] 🟠 Upgrade/downgrade management

---

## **Billing & Payments Console**

* [ ] 🟢 View facility invoices & billing history
* [ ] 🟠 Refunds, adjustments, manual credits
* [ ] 🟡 Payment provider analytics (success rate, failure rate)
* [ ] 🟡 Multi-currency support
* [ ] 🟡 Transaction logs & reconciliation tools
* [ ] 🟡 Gateway-level performance dashboard

---

## **Global Settings**

* [ ] 🟢 Branding defaults
* [ ] 🟢 Supported languages/currency
* [ ] 🟢 System-wide defaults
* [ ] 🟡 Advanced integration options (email, SMS, messaging platforms)

---

## **Compliance & Data Tools**

* [ ] 🟢 GDPR export/delete
* [ ] 🟠 Data retention policies
* [ ] 🟠 Backups + manual export
* [ ] 🟡 Backup verification
* [ ] 🟡 Point-in-time recovery
* [ ] 🟡 Disaster recovery workflows
* [ ] 🟡 Selective data restoration

---

## **Support & Ticketing**

* [ ] 🟢 View/assign tickets
* [ ] 🟠 Priorities & SLAs
* [ ] 🟠 Ticket history & timeline
* [ ] 🟡 Real-time chat support
* [ ] 🟡 Multiple concurrent chats
* [ ] 🟡 Feature request tracking

---

## **Feature Toggles / Remote Config**

* [ ] 🟢 Enable/disable modules per tenant
* [ ] 🟠 Remote config flags applied instantly
* [ ] 🟡 Module upgrade/downgrade analytics

---

## **Audit Logs & Security**

* [ ] 🟢 Log all admin actions
* [ ] 🟠 Resource-level log indexing
* [ ] 🟡 Impersonation session logs
* [ ] 🟡 Security event logging (failed logins, suspicious activity)
* [ ] 🟡 Financial change audits

---

## **Alerts & Incident Dashboard**

* [ ] 🟡 Critical error notifications
* [ ] 🟡 Performance degradation alerts
* [ ] 🟡 Capacity warnings
* [ ] 🟡 Configurable alert thresholds
* [ ] 🟡 Escalation rules & notification channels

---

## **Promotions & Discounts Console**

* [ ] 🟡 Create system-wide or facility-specific promo codes
* [ ] 🟡 Time-limited campaigns
* [ ] 🟡 Percentage, fixed, bundle, or first-time offers
* [ ] 🟡 Redemption limits
* [ ] 🟡 Promo effectiveness analytics (ROI, conversion rate)

---

## **CRM & Sales Pipeline**

* [ ] 🟡 Lead capture (facility name, owner, size, service type)
* [ ] 🟡 Pipeline stages (New → Demo → Proposal → Negotiation → Won/Lost)
* [ ] 🟡 Drag-and-drop pipeline UI
* [ ] 🟡 Deal tracking (tier, modules, value, close date)
* [ ] 🟡 Sales activity logging (calls, emails, tasks)
* [ ] 🟡 Follow-up reminders & task assignment
* [ ] 🟡 Sales analytics (conversion rates, time-to-close, rep performance)
* [ ] 🟡 One-click conversion → create facility account
* [ ] 🟡 Onboarding checklist for new facilities

---

# **2. Key Workflows**

* [ ] 🟢 Create / suspend / delete tenant
* [ ] 🟢 Approve tenant signups
* [ ] 🟠 Configure plan & features (now more complex)
* [ ] 🟠 Backup/restore tenant data
* [ ] 🟠 Manage support tickets & SLAs
* [ ] 🟡 Impersonate facility admin for support
* [ ] 🟡 Send system-wide announcements
* [ ] 🟡 Manage promo campaigns
* [ ] 🟡 Convert sales lead → facility account
* [ ] 🟡 Configure payment providers per facility

---

# **3. Acceptance Criteria**

* [ ] 🟢 Tenant creation & onboarding works end-to-end
* [ ] 🟢 Feature toggles immediately reflect at tenant level
* [ ] 🟢 All admin actions logged immutably
* [ ] 🟡 Impersonation logs show session start, end, and actions
* [ ] 🟡 Promo codes track usage and conversion
* [ ] 🟡 Sales pipeline supports full lead → onboarding workflow
* [ ] 🟡 Alerts fire when thresholds are crossed
* [ ] 🟡 Payment analytics correctly reflect failures & retries

---

# **4. Security**

* [ ] 🟢 Super Admin–only access
* [ ] 🟢 Mandatory MFA
* [ ] 🟢 Immutable audit logs
* [ ] 🟡 IP whitelisting
* [ ] 🟡 Session policy enforcement
* [ ] 🟡 Suspicious activity monitoring
* [ ] 🟡 Compliance-level data retention & purge automation

---

# **2. Facility (Business / Tenant) Admin Panel**

## **Users**

* Owner
* Manager
* Front Desk
* Staff (Groomer, Trainer)
* Custom Roles via RBAC

## **Screens / Components**

* Dashboard
* Services Catalog
* Pricing & Taxes
* Booking Calendar
* Client & Pet CRM
* Staff Scheduling
* Check-In / Check-Out
* Messaging & Notifications
* Payments & Invoicing
* Reports & Exports
* Waivers & Vaccination Vault
* Incident Reporting
* Retail / POS
* Automations
* Facility Settings

## **Key Workflows**

* Setup services & pricing
* Publish available services to client portal
* Create / modify bookings
* Check-in/out workflow
* Manage CRM & pet medical records
* Handle incidents with follow-up tasks

## **Acceptance Criteria**

* Capacity rules must prevent overbooking
* Staff conflicts must be detected unless override exists
* Vaccine reminders triggered automatically

---

### **Facility Admin Checklist**

#### **Services & Pricing**

* [ ] Create/edit services (duration, resources, capacity)
* [ ] Support multiple pricing models
* [ ] Seasonal pricing and blackout dates

#### **Booking & Calendar**

* [ ] Daily/weekly/monthly views with filters
* [ ] Real-time availability + waitlist logic
* [ ] Overbooking prevention + transactional booking

#### **CRM (Clients & Pets)**

* [ ] Household accounts
* [ ] Pet profiles (breed, diet, behavior, vaccines)
* [ ] Vaccine expiry reminders (30/14/7 days)

#### **Staff Scheduling**

* [ ] Shift creation & recurring shifts
* [ ] Conflict detection
* [ ] ICS feed export (Phase 2)

#### **Messaging & Notifications**

* [ ] Internal staff chat
* [ ] Client messaging + preferences
* [ ] Attachments (images, files)

#### **Payments & POS**

* [ ] Stripe card payments, deposits, refunds
* [ ] Invoice templates
* [ ] POS product management & inventory

#### **Incident Reporting**

* [ ] Severity + description + photos
* [ ] Manager approval workflow

#### **Automations & AI**

* [ ] Rule engine (“trigger → action”)
* [ ] AI upsell assistant (Phase 2)

#### **Acceptance & QA**

* [ ] Full booking lifecycle test
* [ ] Shift conflict tests
* [ ] Vaccine reminder tests

---

# **3. Staff Views (Front Desk, Groomer/Trainer, Manager)**

## **Screens**

* Front Desk Quick Panel
* Groomer/Trainer Agenda
* Manager Controls (approvals, staff roster, performance)

## **Key Workflows**

* Quick booking creation
* Fast check-in/out
* Daily task completion
* Photo uploads for report cards

## **Acceptance Criteria**

* Check-in/out should be achievable in < 3 clicks
* Staff should only see data allowed by their role

---

### **Staff Checklist**

* [ ] Role-specific dashboards
* [ ] Mobile-friendly quick actions
* [ ] Photo uploads + compression
* [ ] Internal messaging with mentions
* [ ] Mobile incident report submission

---

# **4. Client (Pet Owner) Portal — Web, Mobile, PWA**

## **Screens / Components**

* Home & My Pets
* Full booking flow
* Pet Health Vault
* Booking history
* Messaging with facility
* Report cards (photos & notes)
* Wallet & payments
* Loyalty points
* Notification center
* Account settings

## **Key Workflows**

* Search facility → choose service → pick time → pay → confirmation
* Upload vaccine documents
* Receive push/email notifications
* View daily report cards

## **Acceptance Criteria**

* One-tap rebook restores previous options
* Vaccine upload triggers reminder monitoring
* Push notifications fall back to email if unavailable

---

### **Client Checklist**

#### **Booking Flow**

* [ ] Real-time availability API
* [ ] Stripe payments + saved cards
* [ ] Deposit support

#### **Pets & Health**

* [ ] Pet profile editing
* [ ] Vaccine upload + expiry tracking
* [ ] Report cards view

#### **UX Enhancements**

* [ ] Smart booking assistant
* [ ] Loyalty points system

#### **Notifications**

* [ ] Push within 5 seconds
* [ ] Email fallback

---

# **5. Public Website & Demo Sandbox**

## **Checklist**

* [ ] Marketing website (features, pricing, FAQ)
* [ ] Self-serve signup
* [ ] 30-day trial flow
* [ ] Demo sandbox with auto-generated data

---

# **6. API, Webhooks & Integrations**

## **APIs**

* REST/GraphQL for tenants, locations, bookings, clients, pets, invoices, etc.

## **Webhooks**

* booking.created / updated / cancelled
* payment.succeeded / refunded
* pet.vaccine.expiring
* message.created

## **Integrations**

* Stripe
* PayPal (optional)
* Firebase/APNs
* SMS (Twilio)
* Accounting (QuickBooks/Xero — Phase 2)

---

### **API / Integration Checklist**

* [ ] API key management (create, rotate, revoke)
* [ ] Webhook management UI
* [ ] Retry logic + delivery logs
* [ ] SDK or Postman collection

---

# **7. Data Model & Multi-Tenancy**

## **Core Entities**

* Tenant, Location, User, Role
* Service, Resource, Booking
* Client, Pet, VaccineRecord
* Invoice, Payment, Message
* Notification, File, AuditLog

## **Strategy**

* PostgreSQL row-level security (RLS)
* Tenant ID enforced at DB & API layer

---

### **Multi-Tenancy Checklist**

* [ ] RLS policies implemented & tested
* [ ] Per-tenant backup & restore
* [ ] Isolation tests (cross-tenant access blocked)

---

# **8. Non-Functional Requirements**

## **Performance**

* P95 < 2.5 seconds at 1k concurrent sessions

## **Security**

* OAuth2/OIDC
* JWT access tokens
* AES-256 at rest
* TLS 1.2+

## **Availability**

* 99.9% uptime
* Multi-AZ deployment
* Daily backups (14-day retention)

## **Accessibility**

* WCAG 2.1 AA
* Bilingual EN/FR

---

### **NFR Checklist**

* [ ] OAuth2/OIDC auth completed
* [ ] JWT session management
* [ ] Encryption at rest & in transit
* [ ] Secrets manager integration
* [ ] Daily backups + DR strategy
* [ ] Logging + monitoring + alerts

---

# **9. MVP Scope (Phase 1)**

## **Includes**

* Tenancy basics
* Facility setup & services
* Daycare & boarding booking engine
* Check-in/out
* CRM + vaccine reminders
* Stripe payments
* Reports
* EN/FR UI
* Audit log

---

### **MVP Checklist**

* [ ] Tenant onboarding + sample data
* [ ] Services CRUD
* [ ] Booking engine (daycare/boarding)
* [ ] Calendar with capacity rules
* [ ] Check-in/out
* [ ] CRM (clients, pets)
* [ ] Vaccine reminders
* [ ] Stripe integration
* [ ] Basic reporting
* [ ] EN/FR translations

---

# **10. Acceptance Criteria Matrix (Short Version)**

* [ ] Booking is atomic & prevents oversell
* [ ] Staff schedule conflict detection works
* [ ] Push notification fallback logic works
* [ ] Vaccine reminders are accurate
