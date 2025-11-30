# Software Requirements Specification (SRS)

## Client Information

**Client:** Puneet  
**Phone:** +1 514-690-8911  
**Email:** singhparminder360@gmail.com  
**Project:** B2B Pet Services CRM & Booking Platform (Multi-tenant)  
**Date:** 2025-11-11

## 1. Executive Summary

Puneet seeks a modern, multi-tenant SaaS platform where businesses (facilities) subscribe to manage their pet services operations (CRM, bookings, staff, messaging), while end customers (pet owners) use free web/mobile portals to book, pay, and communicate. The platform must improve on incumbents by adding staff scheduling, internal messaging, push notifications, and a clear role hierarchy. UI/UX must be modern, fast, and accessible.

## 2. Scope

### In Scope

Multi-tenant B2B SaaS: businesses subscribe; pet owners are non-subscribing end users. Three interfaces: Platform Admin, Business (Facility), Client (Pet Owner). Booking modules: Daycare and Boarding for all facilities; Training and Grooming optionally enabled per facility. Staff scheduling, internal messaging, push notifications, role hierarchy. Payments, invoicing, CRM for clients & pets, vaccination tracking, reporting. Responsive web app.

## 3. Users & Roles

### 3.1 Platform (Super) Admin

Manages tenants (facilities), plans, billing, compliance, support SLAs, global settings. And facility settings (meaning all the settings can be configured or managed which the facility manager or admin has the super admin which is gonna be the main saas can edit and configure that for the tenets)

#### 1. Tenant / Facility Management

- Create, suspend, or delete facilities (kennels, daycares, groomers, etc.)
- Approve or deny new facility signups or trials
- Manage facility onboarding (wizard, default settings, data import)
- View and edit each facility's:
  - Profile (name, logo, contact info, time zone)
  - Billing plan and payment status
  - Subscription start/end date
  - User count and storage usage
  - Activity logs and performance metrics
- Assign or reset facility admin credentials
- Temporarily disable or limit features (e.g. disable booking module for a facility)

#### 2. Subscription & Billing Management

- Manage pricing plans (Free, Basic, Premium, Enterprise)
- Configure features included in each plan
- Control usage limits (number of pets, users, storage, bookings, etc.)
- Handle global and facility-level billing:
  - Payment gateways (Stripe, PayPal, etc.)
  - Tax/VAT configuration by region
  - Automatic invoicing and receipts
  - Refunds, credits, and adjustments
  - Trial period management
- Monitor revenue reports and analytics

#### 3. Global Platform Settings

- Branding and white-labeling options:
  - Platform name, domain, and color theme
  - Default logo and email templates
- Configure integrations available to tenants:
  - Payment gateways
  - SMS/email providers
  - Third-party apps (like QuickBooks and other apps integration for future)
- Global notifications, alerts, and announcements
- Manage default templates:
  - Email/SMS notifications
  - Booking confirmations
  - Waivers & contracts
  - Service descriptions and categories
- Manage supported languages and currency options

#### 4. Compliance & Data Control

- Manage data retention policies
- Configure GDPR/CCPA consent settings
- Access audit logs for all tenants
- Backup and restore databases
- Manage API keys and access tokens
- Control user data export or deletion (facility-level or platform-wide)
- Manage legal documents (Terms of Service, Privacy Policy)

#### 5. Support & Communication

- In-app chat or ticketing system management
- Assign support priority or SLA levels by plan
- Create and manage a help center or knowledge base
- Push system-wide announcements or messages to facilities
- Track support performance metrics (response time, tickets per facility)

#### 6. Analytics & Reporting

- Global dashboard:
  - Total facilities, users, bookings, revenue, etc.
  - Facility usage metrics and activity trends
- Facility-specific analytics:
  - Volume of bookings, revenue, staff logins, etc.
- Performance tracking (e.g. slow facilities, errors)
- Export reports (CSV, XLSX, PDF)
- Real-time monitoring for uptime, errors, and billing activity

#### 7. Facility Configuration Control (Super Admin can override or configure for each tenant)

- Service settings (boarding, daycare, grooming, training, etc.)
- Pricing structures and tax settings
- Booking rules (cut-off times, deposits, cancellation)
- Check-in/out times
- Vaccination/medical record requirements
- User roles and permissions
- Staff scheduling configurations
- Notification preferences
- Pet weight/size categories and breed restrictions
- Custom fields or tags (pets, customers, bookings)
- Default reports and dashboard layout
- Waivers, forms, and contracts and the ability to

#### 8. User & Role Management

- Global user database (all facilities)
- Assign or revoke roles (Facility Admin, Manager, Staff, Customer)
- Force password resets or 2FA for users
- Manage impersonation feature (login as facility admin for troubleshooting)
- Access logs and login history

#### 4.19 Task & Operations Management

- Task templates per service (cleaning room, feeding schedule, grooming checklist).
- Assign tasks to staff automatically when booking created.
- Task completion tracking with photo proof.
- Internal notes & audit trail per booking.

#### 4.20 AI & Personalization (Future-Ready)

- AI chat assistant for clients ("Book Bella's next grooming").
- AI summary notes from staff messages or reports.
- Facility insights ("You're 85% full next week — consider promoting daycare passes").
- Views platform-wide analytics and audit logs.

### 3.2 Business (Facility) Side

Business Owner / Tenant Admin: full control of the facility's settings, staff, services, pricing, taxes, branding.  
Manager: operational controls (calendar, bookings, staff schedules, messaging, refunds per policy).  
Front Desk: create/edit bookings, check-in/out, take payments, message clients.  
Groomer / Trainer / Tech: see assigned appointments, update notes, mark tasks done, message internal.  
Custom Roles: configurable permissions via Role-Based Access Control (RBAC) and role hierarchy (Owner > Manager > Staff > Limited).

🏢 **Facility (Tenant) Admin Panel**

Each facility subscribes to core and optional modules. Modules can be toggled on/off based on plan or add-ons.

**Core Modules**

- Dashboard & Reports – Overview of daily operations, revenue, occupancy, and KPIs.
- Client & Pet Management – Store pet profiles, vaccination records, notes, tags, and owner details.
- Bookings & Scheduling – Manage reservations, calendar views, staff assignments, and capacity.
- Billing & Payments – Process payments, invoices, deposits, and refunds (integrated with Stripe/PayPal).
- Notifications & Messaging – Automated confirmations, reminders, and system alerts via email/SMS.

**Add-On Modules (Feature-Based Subscriptions)**

- 🐶 Daycare Module – Check-ins/outs, capacity tracking, half/full-day rates, report cards.
- 🏠 Boarding Module – Nightly rates, feeding/medication schedules, kennel assignment, stay extensions.
- ✂ Grooming Module – Service catalog, grooming packages, stylist assignment, repeat bookings.
- 🎓 Training Module – Class schedules, progress tracking, package billing, trainer notes.
- 💬 SMS Module – Two-way texting with clients, automated message campaigns, delivery logs.
- 📧 Email Marketing Module – Newsletter builder, automation flows, pet birthday emails, and segmentation.
- 👥 Staff Management Module – Shift scheduling, task assignment, permissions, time tracking.
- 🔄 AI Upsell Assistant – Suggests service upgrades or add-ons to clients automatically based on past behavior.
- 📸 Live PetCam Integration – Link live camera feeds for clients to view their pets (optional IoT integration).
- 📱 Mobile App White-Label Option – Branded mobile app for each facility (powered by your SaaS backend).
- 💡 Smart Insights Dashboard – AI-driven insights (e.g., busiest hours, client churn risk, top revenue services).
- 🎁 Loyalty & Rewards Module – Points and rewards system integrated into client profiles.
- 🤖 Automation Rules Builder – "If this, then that" automation (e.g., send SMS when pet is checked out).
- 🗂 Digital Waivers & E-Signatures – Store and manage signed forms and contracts.
- 🔔 Multi-Location Management – Centralized admin for businesses with multiple branches.

### 3.3 Client (Pet Owner)

Registers free account, creates pet profiles, uploads vaccine proofs, books & pays, receives notifications, messages the facility.

🐾 **Client (Pet Owner) Portal**

Registers a free account, creates pet profiles, uploads vaccination proofs, books and pays online, receives notifications, and messages the facility directly.

**Enhanced & Unique Features for Engagement & Convenience:**

- 🧠 Smart Booking Assistant: Remembers favorite services, staff, and times — suggests next booking automatically ("It's time for Bella's next grooming!").
- 📅 One-Tap Rebook: Rebook previous services instantly without refilling forms.
- 🐕 Pet Journal / Report Cards: See daily photos, videos, and updates shared by staff (creates emotional engagement).
- 🎉 Loyalty & Rewards: Earn points for every booking or referral, redeem for discounts or free add-ons.
- 💳 Saved Cards & Wallet: Store payment methods, buy packages, track balances.
- 📲 Real-Time Updates: Check-in/out status, feeding/grooming progress, live notifications.
- 🧾 Service History & Receipts: View complete history of visits, invoices, and notes per pet.
- 🐶 Pet Health Vault: Store and share medical or vaccination documents digitally with auto-reminder for expiry dates for them to get the vaccinations renewed.
- 💬 Two-Way Messaging: Chat directly with staff, send quick updates ("I'll be 10 min late" or "Add nail trim").
- 💡 Personalized Offers: AI recommends new services or products based on booking patterns.

## 4. Functional Requirements

### 4.1 Tenant Onboarding & Subscription (B2B)

Create tenant via invite or self-serve sign-up.

#### 4.1.1 Tenant Onboarding & Subscription (B2B)

Create tenant via invite or self-serve sign-up. Choose plan (tiers), add payment method, billing address, and tax IDs (QC/CA ready). Multi-location support under one tenant with location-level calendars, capacity, and staff. White-label options per facility (logo, colors, custom domain optional).

**Free Trial & Demo Access:**

- Offer a 1-month free trial for new facilities to explore the platform.
- Generate a fully functional demo account (sandbox mode) preloaded with sample data — bookings, clients, pets, and payments — to showcase platform capabilities.
- Trial tenants can access all modules with usage limits (e.g., max bookings, limited SMS credits).
- Automatic onboarding walkthrough/tutorial for first-time users.
- At the end of the trial, prompt upgrade to a paid plan with seamless data migration (no data loss).

Choose plan (tiers), add payment method, billing address, tax IDs (QC/CA ready). Multi-location support under one tenant with location-level calendars, capacity, and staff. White-label options per facility (logo, colors, custom domain optional).

### 4.2 Services Catalogue & Pricing

Define services per location: Daycare, Boarding, Training, Grooming (enable/disable). Pricing models: flat, time-based, weight/size-based, add-ons (e.g., nail trim), packages/memberships (Phase 2). Blackout dates, seasonal pricing, taxes, and deposits.

### 4.3 Booking & Calendar

Unified calendar with views (day/week/month) and filters (service/staff/room/kennel). Online booking (client-side) + staff back-office booking. Capacity management: daycare spots, boarding kennels/suites, grooming tables, training slots. Check-in/out workflows & late pickup rules; overbooking safeguards & waitlists. Cancellation/refund policies configurable per service.

### 4.4 Clients, Pets & Compliance (CRM)

Client profiles, household, payment methods, communication preferences. Pet profiles: breed, size, diet, meds, behavior notes; vaccination tracking with expiry reminders and document upload. Forms/waivers e-signature (boarding agreement, daycare rules, training liability).

### 4.5 Staff Scheduling (New vs current CRM)

Create shifts, assign staff, manage time-off/availability, recurring schedules. Conflict detection (double-booked staff), workload balancing. Export to CSV; optional ICS feed (Phase 2).

### 4.6 Internal Messaging

1:1 and group channels for staff; message threads tied to bookings or pets. Read receipts, mentions, file/photo attachments (grooming before/after, boarding updates). Moderation & retention policies.

### 4.7 Client Messaging & Notifications

Client <> facility messaging inbox within app/web. Push notifications: booking confirmations, updates, photo shares, vaccine expiry. Email notifications fallback; optional SMS (per-message fee). Notification center with per-user preferences.

### 4.8 Payments & Invoicing

Card payments (Stripe preferred), deposits, tips, refunds, partial payments. Invoices/receipts with taxes, discounts, and payment status. Payouts/reports for reconciliation; export to accounting (QuickBooks/Xero Phase 2).

### 4.9 Reporting & Analytics

Revenue, bookings by service, utilization (kennels, staff), cancellation reasons. Client lifetime value, repeat rate, top add-ons. Download CSV/PDF; schedule reports (Phase 2).

### 4.10 Support & Service Quality

In-app help center, ticketing to Platform Admin team. SLA targets (see §10.6), release notes, status page link.

### 4.11 Custom Automation Rules (IFTTT-style)

e.g., "When pet checks in → Send welcome SMS + start daycare timer." "When vaccine expires → notify owner." Prebuilt automation templates (auto reminders, follow-ups, feedback requests). AI-driven booking assistant

### 4.12 Marketing & Loyalty

Loyalty & Rewards Program: Points per booking or referral, redeemable for discounts.  
Email Campaign Builder: Drag & drop newsletters, pet birthdays, promo offers.  
Referral System: Track referrals with automated rewards.  
AI Recommendations: Suggest upsells (e.g., "Add nail trim?" during checkout).  
Gift Cards & Prepaid Credits.

### 4.13 Client Experience Enhancements

What makes clients stay engaged with the app.

- Pet Report Cards / Journals: Photos, notes, videos from staff after each visit.
- Photo Feed Integration: share daily pictures securely.
- Pet Health Vault: Store vet records, medications, allergies, reminders.
- Mobile App Access: PWA or native app for easy rebooking & notifications.

### 4.14 Packages, Memberships & Subscriptions

Recurring revenue tools are underdeveloped in most competitors.

- Auto-renewing daycare passes or monthly memberships.
- Package usage tracking (e.g., "8/10 daycare visits used").
- Flexible expiration, auto top-up, and proration rules (can be set by the tenets according to their policies)

### 4.15 Multi-Location Intelligence

Especially valuable for growing franchises.

- HQ dashboard: compare performance across branches.
- Centralized client/pet data across locations.
- Transfer booking between locations.
- Staff pool visibility (shared staff between branches).

### 4.16 Advanced Analytics & Forecasting

Go beyond static reports.

- Predictive analytics (AI forecasting occupancy, revenue trends).
- Churn probability detection (clients who stopped booking). This is very crucial thing to be able to check and send them offers or discounts to be able to bring them back in
- Profitability per service or staff member.
- Visual dashboards with drill-down capabilities.

🛍 **4.17 Retail / POS Module**

Enables facilities to sell pet products (food, treats, accessories, toys, etc.) both in-store and online through an integrated inventory and checkout system.

**Core Features**

- Product Catalog Management: Add/edit products with SKU, barcode, categories, pricing, taxes, and stock levels. Support for product variants (size, flavor, color, etc.). Upload product photos and descriptions.
- Inventory Control: Real-time stock tracking and low-stock alerts. Purchase order tracking and supplier management. Stock adjustments and movement logs (per location).
- Sales & Checkout: POS interface for in-person sales (cash, card, gift card). Client lookup integration with CRM (link sales to pet owner). Apply discounts, promo codes, and product bundles or service + product combos (e.g., "Grooming + Shampoo"). Auto-apply discounts for packages.
- Reporting & Analytics: Track sales by product, category, or staff. Inventory valuation, profit margins, and top-selling items. Export reports (CSV/PDF).
- Integration Points: Shared client/pet data from CRM. Payment processing via Stripe (shared billing engine). Optional accounting sync (QuickBooks/Xero). Loyalty points accumulation for purchases

**Incident Reporting**

Facilities must be able to log, track, and review any incidents involving pets, clients, or staff. This includes behavior issues, injuries, fights, escapes, medical episodes, or property damage.

**Key Requirements:**

- Create Incident Report: Staff can file an incident tied to a pet, booking, or daycare/boarding stay.
- Incident Types: Behavior issue, fight, bite, injury, escape attempt, illness, accident, property damage, etc.
- Details Captured:
  - Date/time
  - Location/area (yard, grooming, lobby, kennel, etc.)
  - Staff involved
  - Pets involved
  - Description of what happened
  - Actions taken (first aid, separation, vet contacted, etc.)
  - Severity level (low/medium/high)
- Photo/Video Attachments: Staff can upload media evidence.
- Internal vs. Client-Facing Notes:
  - Internal notes (visible only to staff)
  - Client-facing summary (optional and editable by managers)
- Notifications:
  - Manager notified automatically for medium/high severity
  - Option to send client notification or report summary
- Incident History:
  - All incidents logged in the pet's history
  - Visible alerts for "repeat incidents"
- Follow-up Tasks:
  - Assign corrective actions (e.g., behavior assessment, vet check)
  - Mark as resolved/closed
- Permissions:
  - Only managers/admins can edit or approve incidents
  - Staff can create but not delete

## 5. Non-Functional Requirements

### 5.1 Performance & Scalability

P95 page loads < 2.5s at 1k concurrent client sessions per region. Horizontal scaling for booking spikes (morning/evening).

### 5.2 Security & Compliance

OAuth2/OIDC + JWT sessions; passwordless optional. RBAC with least-privilege; organization-scoped data isolation (strict multi-tenant boundaries). Data encryption in transit (TLS 1.2+) and at rest (AES-256). Audit logs for admin actions and data exports. Privacy: PIPEDA/Quebec Law 25 alignment; DPA & SCCs on request.

### 5.3 Availability & Resilience

Target uptime 99.9% monthly; multi-AZ deployment. Automated backups (daily) with 14-day retention; disaster recovery RPO ≤ 24h, RTO ≤ 8h.

### 5.4 Accessibility & Localization

WCAG 2.1 AA; keyboard navigation and screen reader labels. Bilingual EN/FR-CA; time zone America/Toronto and CA holiday presets.

### 5.5 Observability

Metrics, logs, traces; anomaly alerts on errors, latency, booking failures.

## 6. Architecture (High-Level)

Frontend: Web (React) for Admin & Business; Client web with web push.  
Backend: Node.js/NestJS (or equivalent) REST/GraphQL API; event bus for notifications.  
Database: PostgreSQL (row-level tenant scoping); Redis optional for queues/caching.  
Storage: Object storage for files/photos (S3-compatible).  
Notifications: Firebase (Web Push); SMTP provider for email; Twilio (optional) for SMS.  
Payments: Stripe (cards, Apple/Google Pay); webhooks for events.

## 7. Data Model (Primary Entities)

Tenant (Business/Facility), Location, User (Staff/Client), Role (RBAC), Service (Daycare/Boarding/Training/Grooming), Resource (kennel/room/table), Schedule/Shift, Booking/Appointment, Invoice/Payment/Refund, Pet, VaccineRecord, Message/Thread, File (photos, docs), Notification, AuditLog.

Key relations: Tenant 1-N Locations; Location 1-N Services/Resources/Bookings; Client 1-N Pets; Booking N-1 Pet; Booking N-N Staff; Message ↔ Booking/Pet (linkable).

## 8. User Flows (Happy Paths)

1. Business Onboarding → Create tenant → choose services & pricing → invite staff → set booking rules → publish client portal.
2. Client Booking → Pick facility/service/date → see capacity/prices → pay deposit → receive confirmation & push.
3. Staff Scheduling → Create shifts → assign staff → resolve conflicts → publish weekly view → staff get notifications.
4. Grooming Update → Groomer uploads photos → client gets push → rates experience (Phase 2 reviews).
5. Messaging → Client asks question in portal → Front Desk replies → thread stored on booking.

## 9. Permissions Matrix (excerpt)

Owner: all tenant scopes, billing, role management.  
Manager: calendars, bookings, refunds (limit), schedules, messaging, reports.  
Front Desk: bookings, check-in/out, payments (no refunds > threshold), messaging.  
Groomer/Trainer: view own schedule/bookings, update notes/photos, internal chat.  
Client: manage pets, book/pay, view history, message facility.

**Roles, Permissions & Access Control**

Granular, role-based permission system allowing each facility to manage what staff can see and do within the platform. Supports default roles (Owner/Admin, Manager, Staff, Front Desk, Groomer, Trainer) with custom role creation per facility.

**Core Features**

- Role Management:
  - Create, edit, and assign custom roles to staff members.
  - Define permissions per module (e.g., Bookings, Clients, Pets, Payments, Reports, Retail).
  - Role templates provided for quick setup (Front Desk, Groomer, Trainer, etc.).
- Access Scope:
  - Restrict visibility by location (for multi-location tenants).
  - Limit access to personal bookings, assigned pets, or shifts only.
  - Separate staff and management dashboards.
- Financial Visibility Controls:
  - Ability to hide or restrict all monetary data (totals, invoices, payments, client spend history).
  - Hide "Total Revenue," "Amount Paid," "Client Lifetime Value," and similar financial metrics from non-admin staff.
  - Allow partial access (e.g., view booking price but not cumulative revenue).
  - Prevent staff from viewing or exporting financial reports unless explicitly permitted.
- Sensitive Data Controls:
  - Restrict access to vaccination documents, client personal data, or notes.
  - Allow role-based control over who can edit bookings, apply discounts, or issue refunds.
  - Option to disable client phone/email visibility for certain roles (privacy mode).
- Audit & Activity Logging:
  - Track all staff actions (bookings edited, refunds processed, messages sent).
  - Export or view audit logs by date, staff member, or action type.

## 10. Compliance, Support & SLAs

### 10.1 Data Protection

DPA upon request; data residency preference Canada-based where feasible.

### 10.2 Backups & DR

Daily automated backups; quarterly DR test.

### 10.3 Monitoring & Incident Response

24/7 monitoring, severity definitions; client status page link.

### 10.4 Access Controls

SSO for tenant admins (Phase 2), MFA optional.

### 10.5 Logging & Auditing

Immutable audit trails for admin/security-sensitive actions.

### 10.6 Support Levels (example)

Standard: Business hours (M-F 9-5 ET), response ≤ 1 business day.  
Premium (add-on): 7/7 8-20 ET, response ≤ 4h, success manager.

## 11. UI/UX Principles

Clean, modern, mobile-first; clear contrasts, large tap-targets, minimal cognitive load. One-click actions for high-frequency tasks (check-in/out, confirm payment, upload vaccine proof). Accessible color palette; bilingual content; concise microcopy.

## 12. MVP Definition (Phase 1)

Tenancy & subscription basics; facility setup; services catalogue & pricing. Booking engine for Daycare & Boarding (client & staff), capacity control, check-in/out. CRM (clients, pets, vaccines), invoices & card payments (Stripe), email notifications. Basic reports (revenue, bookings by service), audit log, EN/FR UI.

Success Criteria (MVP): Create a tenant, configure services, accept ≥1 real booking with payment, run E2E check-in/out, send notifications, and export a revenue report for a defined period.

## 13. Phase Plan

Phase 1 (MVP): §12 scope.  
Phase 2: Staff scheduling; internal messaging; push notifications; grooming/training modules; advanced reports.  
Phase 3: Memberships/packages, SMS, accounting exports, white-label domains, SSO/MFA, reviews/ratings.

## 14. Integrations & Webhooks

Stripe payments; Firebase/APNs push; SMTP email; Twilio SMS (opt-in). Webhooks: booking.created/updated/cancelled, payment.succeeded/refunded, pet.vaccine.expiring, message.created.

## 15. Acceptance Criteria (Samples)

Role Hierarchy: Tenant Owner can create a custom role restricting refunds; user with that role cannot issue a refund above threshold and UI blocks the action with rationale.

Staff Scheduling: Creating overlapping shifts for the same staff triggers a conflict warning and prevents save unless override permission is present.

Push Notifications: When a booking is confirmed, the client device receives a push within 5 seconds; if no device token, an email is sent.

Vaccination Expiry: Clients with expiring vaccines (≤14 days) appear in a filterable list and receive automated reminders.

## 16. Risks & Mitigations

Double-booking / capacity drift → server-side transactional checks and idempotent booking API.  
Data isolation (multi-tenant) → row-level policies, tenant IDs enforced at all layers, automated tests.  
Notification deliverability → fallback channels (push → email → SMS optional), provider status monitoring.

## 17. Reporting & KPIs (Owner View)

MRR/ARR by plan; active tenants; DAU/MAU; booking conversion; churn/retention; NPS (Phase 3).

## 18. Glossary

Tenant: A subscribing business/facility.  
Client: Pet owner end-user (non-subscriber).  
RBAC: Role-Based Access Control.  
MVP: Minimum Viable Product.

## Appendix A – Configuration Defaults (Draft)

Booking buffers: 15 min.  
Cancellation policy: 24h before start (example).  
Vaccine reminders: 30/14/7 days before expiry.  
Tax region: QC. Tax regions can be custom it could be provinces of Canada and also provinces in the USA as well, because the clients could be from Canada or USA so the currencies needs to be changed according to client location.
