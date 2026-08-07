# Yipyy — Terms of Service

**Status: DRAFT — not published. Must be reviewed by a qualified attorney before use.**
Version 0.1 · Drafted 2026-08-07 · Placeholders in `[BRACKETS]` are unconfirmed.

> **How this draft was produced.** Every operative statement below was checked
> against the codebase. Where the product does not do something, this document
> does not claim it — see the _Reviewer notes_ at the end for the specific
> things that were deliberately left out, and why.

---

## 1. Acceptance of these Terms

These Terms of Service ("**Terms**") govern access to and use of the Yipyy
platform (the "**Service**"), operated by **[LEGAL ENTITY NAME]**, **[ENTITY
TYPE]** of **[REGISTERED ADDRESS]** ("**Yipyy**", "**we**", "**us**").

By creating an account, accessing a facility's Yipyy site, or using the
Service, you agree to these Terms. If you do not agree, do not use the Service.

If you accept these Terms on behalf of a business, you represent that you have
authority to bind that business, and "**you**" means that business.

## 2. Who the Service is for, and the three kinds of user

The Service is business-management software for pet-care businesses — boarding,
daycare, grooming and training. Three distinct kinds of user are governed by
these Terms:

| Kind of user           | What it means                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Facility**           | A pet-care business that subscribes to the Service. Provisioned by Yipyy, with its own site at `<name>.yipyy.com`.       |
| **Facility Personnel** | Owners, managers and staff a Facility invites. Their access is granted, changed and removed by the Facility or by Yipyy. |
| **Customer**           | A pet owner who holds a record with a Facility and may be given access to that Facility's customer portal.               |

**A Facility is provisioned by Yipyy, not by self-service.** Only Yipyy platform
administrators can create a Facility, and doing so records the Facility, its
first location, its owner and that owner's invitation in a single transaction.

**Customer accounts are scoped to one Facility.** A Customer record belongs to
exactly one Facility. Registering at one Facility creates nothing at any other,
and being a Customer of one Facility gives you no visibility of, or standing
with, any other Facility on the Service. A single Yipyy sign-in credential may
hold separate Customer records at more than one Facility; those records remain
separate.

**A Facility decides whether it accepts self-registration.** Public customer
sign-up is **off by default** and each Facility chooses whether to enable it. A
Facility that keeps it off can still admit Customers by creating their record;
that person may then link their sign-in to the record waiting for them.

## 3. Eligibility

You must be at least **[MINIMUM AGE]** years old and able to form a binding
contract to use the Service.

> **The Service does not currently verify age.** No age or eligibility check is
> performed at sign-up. This clause is a contractual requirement, not a
> technical control, and Facilities remain responsible for who they invite.

## 4. Accounts and authentication

Sign-in is provided through **Clerk**. You may create a credential with an
email address and password, or sign in with Google. Yipyy never receives or
stores your password.

**Access is tied to your verified email address.** Invitations to join a
Facility — as an owner, as staff, or as a Customer whose record is waiting —
are matched to the email address on your account. Forwarding an invitation
email grants nobody else access, because the link is an ordinary sign-up page
and the grant is claimed only by an account carrying that address.

You are responsible for:

- keeping your credentials confidential and for all activity under your account;
- the accuracy of information you provide; and
- notifying us promptly at **[SECURITY CONTACT EMAIL]** of any unauthorised use.

Yipyy may invite, re-send, re-address or withdraw an invitation to a Facility
owner. An invitation that has already been accepted cannot be re-addressed —
removing access is a separate act.

## 5. What each party controls

**The Facility controls its own records.** Client records, pets, bookings,
appointments, photos, notes, staff records and documents belong to the Facility
that created them. Yipyy holds and processes them on that Facility's behalf.

**Yipyy enforces separation between Facilities at the database layer.** Access
is scoped by row-level security keyed to your signed-in identity, not by the
interface. This is a technical control we operate; it is described here so you
understand the boundary, and it is not a warranty (see section 12).

**Customers deal with their Facility.** If you are a Customer, your relationship
about services, bookings, prices, cancellations, refunds and the care of your
animal is with the Facility — not with Yipyy. Yipyy provides the software the
Facility uses to run its business. We are not a party to that relationship, do
not supervise it, and do not provide pet-care services of any kind.

## 6. Acceptable use

You must not:

- access, or attempt to access, data belonging to another Facility or to a
  person whose record you are not entitled to see;
- share credentials, or use another person's account;
- upload content that is unlawful, infringing, or that you lack the rights to
  upload;
- upload malicious code, or attempt to disrupt, overload or reverse-engineer
  the Service;
- use the Service to send unlawful communications, including messages that
  breach applicable marketing, telephone or electronic-communications law;
- misrepresent your identity or your authority to act for a business; or
- use the Service in breach of any applicable law, including animal-welfare,
  employment, consumer-protection and privacy law.

> **The Service does not perform automated content moderation.** Uploaded
> content is not screened. Enforcement of this section is by review and by the
> suspension rights in section 13.

## 7. Your content

**You keep ownership.** You retain all rights in the content you or your
personnel put into the Service — client and pet records, booking and care
notes, grooming photographs, documents, signatures, logos and branding.

**The licence you grant us.** You grant Yipyy a worldwide, non-exclusive,
royalty-free licence to host, store, reproduce, transmit and display your
content **solely to provide, secure, support and improve the Service for you**,
and to comply with law. This licence ends when the content is deleted, except
for copies retained in backups or where the law requires retention.

**We do not use your content to train artificial-intelligence models**, and we
do not sell it.

**What can be uploaded.** The Service accepts:

| Content              | Format               | Size limit | Visibility                                        |
| -------------------- | -------------------- | ---------- | ------------------------------------------------- |
| Facility logo        | PNG, JPEG, WebP      | 2 MB       | **Public** — shown on the Facility's sign-in page |
| Grooming photographs | PNG, JPEG, HEIC      | 10 MB      | Private to the Facility                           |
| Staff documents      | PDF, PNG, JPEG, HEIC | 10 MB      | Private to the Facility                           |

These limits are enforced by the storage layer, not only by the interface. A
Facility logo is deliberately public: it appears on a page nobody has signed in
to. Do not upload anything confidential as a logo.

**Personal data of others.** Where you upload information about your customers,
their animals or your staff, you are responsible for having a lawful basis to
do so and for providing any notices those people are owed. As between us, you
are the controller of that data and Yipyy is the processor. **[DATA PROCESSING
AGREEMENT — confirm whether a separate DPA governs, and cross-reference it.]**

## 8. Subscriptions, fees and payments

### 8.1 Your subscription to Yipyy

Each Facility has a subscription record with a plan, an amount, a billing cycle
(monthly, quarterly or yearly) and a status (trialing, active, past due,
suspended or cancelled). New Facilities begin on a **[TRIAL LENGTH]** trial.

> **The Service does not currently charge anyone.** No payment processor is
> integrated. The subscription record determines what a Facility may access; it
> does not itself take money. Fees are invoiced and collected \*\*[HOW: OUTSIDE
>
> > THE PLATFORM / BY INVOICE / OTHER — confirm]\*\*.

Fees, plan inclusions and any usage-based charges are as set out at
**[PRICING PAGE URL]** or in your order form. **[REFUND POLICY — confirm.
Common positions: no refunds for partial periods; pro-rata on downgrade; a
stated cooling-off period. Do not publish without deciding.]**

**[TAX — confirm whether prices are exclusive of sales tax / GST / HST / VAT
and who bears it.]**

### 8.2 Money the Facility handles

Facilities may **record** payments taken from their own customers, apply store
credit, and record tips and discounts. These are bookkeeping records of money
the Facility collected by its own means.

**Yipyy does not process, hold, transmit or refund any payment between a
Facility and its customers.** Any dispute about such a payment is between the
Customer and the Facility.

## 9. Artificial-intelligence features

Parts of the Service use a third-party AI model (**Anthropic's Claude**) to
draft text — for example, summarising a pet's evaluation, drafting a report-card
summary, or generating short passages of copy. These features:

- are **assistive drafts, not professional advice**. Output may be inaccurate,
  incomplete or unsuitable, and is **not** veterinary, medical, behavioural,
  legal or financial advice;
- must be **reviewed by a person before being relied on or sent to a customer**.
  You remain responsible for anything you publish, send or act upon;
- transmit the information you supply for the request to Anthropic for
  processing, subject to Anthropic's terms; and
- may be unavailable, and may change or be withdrawn.

AI features are available only to signed-in users acting for a Facility, and
are scoped to that Facility's data.

**No decision with legal or significant effects on any person is made by these
features.** They produce text for a human to review.

## 10. Third-party services

The Service depends on third parties. Your use of the Service is also subject
to their terms where they apply to you:

| Provider              | Role in the Service                                 |
| --------------------- | --------------------------------------------------- |
| **Clerk**             | Identity and sign-in                                |
| **Supabase**          | Database and file storage                           |
| **Vercel**            | Hosting and delivery                                |
| **Anthropic**         | AI text generation (section 9)                      |
| **Resend**            | Transactional email (invitations, security notices) |
| **Google**            | Optional sign-in provider                           |
| **Twilio**            | Voice and messaging, where a Facility configures it |
| **Intuit QuickBooks** | Optional accounting synchronisation                 |
| **Slack**             | Optional notification delivery                      |

Optional integrations operate only if a Facility supplies its own credentials
for them. Where you connect such a service, you are responsible for your
relationship with that provider, for the credentials you supply, and for the
data you send there.

**Call recording and messaging.** Where a Facility enables telephony features,
that Facility is solely responsible for obtaining any consent that applicable
law requires before recording, transcribing or messaging any person, and for
complying with telemarketing and electronic-messaging law. Yipyy provides the
tooling; it does not obtain consent on your behalf.

## 11. Intellectual property

The Service, its software, design and documentation are owned by Yipyy and its
licensors, and are protected by intellectual-property law. Subject to these
Terms and to payment of any applicable fees, we grant each Facility a
non-exclusive, non-transferable, revocable right to access and use the Service
during the subscription term.

Nothing in these Terms transfers ownership of the Service to you, or of your
content to us. You may not copy, modify, distribute, sell or create derivative
works from the Service, or remove its proprietary notices.

Feedback you send us may be used without restriction or obligation.

## 12. Disclaimers

The Service is provided **"as is" and "as available"**. To the fullest extent
permitted by law, Yipyy disclaims all warranties, express or implied, including
merchantability, fitness for a particular purpose, non-infringement, and any
warranty that the Service will be uninterrupted, secure, error-free or free of
data loss.

Yipyy does not warrant that AI-generated output is accurate or fit for any
purpose (section 9).

Yipyy is **not** a veterinary, boarding, grooming, training or animal-care
provider, is not a payment processor, is not a party to any transaction between
a Facility and its customers, and is not an employer of any Facility Personnel.

**[JURISDICTION NOTE: some consumer-protection regimes — including in Québec,
the rest of Canada, the EU/UK and Australia — do not permit the exclusion of
certain statutory guarantees. Counsel should add a savings clause.]**

## 13. Suspension and termination

### 13.1 By Yipyy

We may suspend or terminate access where:

- a subscription is unpaid, cancelled or lapses;
- these Terms are breached, including section 6;
- we are required to by law; or
- continued access presents a security risk.

**What suspension does.** Suspending a Facility closes the doors, not the
archive. Its personnel lose the ability to operate the Facility — the data
stops being readable through the application — and **nothing is deleted or
anonymised**. The Facility's owner can still see that the Facility exists, see
its status, and reach the screens needed to resolve the situation. Restoring
the subscription restores access to everything.

**Deleting a Facility outright** is restricted to Yipyy superadministrators and
is a separate act from suspension.

Where practical, we will give notice before suspending for a reason other than
non-payment or a security risk. **[NOTICE PERIOD — confirm.]**

### 13.2 By you

A Facility may stop using the Service and request cancellation at
**[BILLING CONTACT EMAIL]**. **[Confirm: notice period, effect on the remainder
of a paid term, and whether cancellation is self-service.]**

### 13.3 After termination

**[DATA RETENTION AND RETURN — confirm the period during which a terminated
Facility may request its data, the format it is provided in, and when data is
deleted. See Reviewer note 4: the Service does not currently perform an
automated export or an automated account-wide deletion, so whatever is promised
here must be operationally deliverable by hand.]**

Sections that by their nature should survive — 7 (ownership), 11, 12, 14, 16
and 17 — survive termination.

## 14. Limitation of liability

To the fullest extent permitted by law, neither party is liable for indirect,
incidental, special, consequential or punitive damages, or for lost profits,
lost revenue, lost goodwill, or lost or corrupted data, however caused.

Yipyy's total aggregate liability arising out of or relating to the Service and
these Terms is limited to **[LIABILITY CAP — e.g. the fees paid by that
Facility in the [12] months before the event giving rise to the claim; for
Customers, who pay Yipyy nothing, a stated monetary cap such as [AMOUNT]]**.

Nothing limits liability for death or personal injury caused by negligence,
fraud, or anything else that cannot lawfully be limited.

> **This clause is unusually important for this Service** because a Facility's
> operational records live here. Counsel should confirm the cap is proportionate
> and enforceable in the chosen forum.

## 15. Indemnification

You will indemnify and hold harmless Yipyy against claims, damages and
reasonable costs arising from: your content; your use of the Service in breach
of these Terms or of law; your relationship with your own customers, staff or
animals in your care; and communications you send using the Service.

## 16. Changes to the Service and to these Terms

We may change the Service, and we may change these Terms. Where a change
materially reduces your rights, we will give **[NOTICE PERIOD]** notice by
**[EMAIL / IN-APP NOTICE / BOTH]**. Continued use after a change takes effect
means you accept it. If you do not accept, stop using the Service and
**[cancellation/refund consequence — confirm]**.

## 17. Governing law and disputes

These Terms are governed by the laws of **[GOVERNING LAW — e.g. the Province of
Québec and the federal laws of Canada applicable therein]**, without regard to
conflict-of-laws rules. The courts of **[VENUE]** have exclusive jurisdiction,
subject to any non-waivable right a consumer has to bring proceedings locally.

**[DISPUTE RESOLUTION — confirm whether you want mandatory arbitration and a
class-action waiver. Note: these are unenforceable or restricted for consumers
in several relevant jurisdictions, including Québec. Do not copy a US-style
arbitration clause without advice.]**

## 18. General

These Terms, together with any order form and **[PRIVACY POLICY URL]**, are the
entire agreement between us about the Service. If a provision is unenforceable,
the rest continues in force. A failure to enforce a provision is not a waiver
of it. You may not assign these Terms without our consent; we may assign them
to an affiliate or in connection with a merger or sale of assets.

## 19. Contact

**[LEGAL ENTITY NAME]**
**[REGISTERED ADDRESS]**
General: **[SUPPORT EMAIL]** · Legal: **[LEGAL EMAIL]** · Security:
**[SECURITY CONTACT EMAIL]**

---

# Reviewer notes

**These notes are for your counsel and are not part of the published Terms.**

### Assumptions made, which you should correct

1. **Entity, law and venue are unconfirmed.** The codebase defaults to the
   `America/Toronto` timezone and the operating contact is `develop@yipyy.com`,
   which _suggests_ a Canadian entity — but that is an inference from
   configuration, not evidence. Nothing in the repository names a legal entity,
   an address, or a jurisdiction. Every such point is bracketed.

2. **Minimum age is unconfirmed.** No age check exists anywhere in the code.
   Section 3 is therefore contractual only. If you intend to serve consumers in
   the EU/UK, or to rely on a specific children's-privacy position, this needs a
   deliberate answer rather than a number copied from another product.

3. **Pricing, refunds and tax are unconfirmed** and cannot be derived from code
   — see finding 3 below.

### Where the draft deliberately says less than a template would

4. **No data-portability or erasure promise.** The Service has screens for GDPR
   Article 20 export and Article 17 erasure, but neither is connected to the
   database: `src/lib/dsr-store.ts:1-22` is a `localStorage` store seeded from
   static data, and `src/lib/facility-export.ts:1-25` builds its ZIP from mock
   arrays in `src/data/`. Individual records _can_ genuinely be deleted through
   the API (`src/app/api/clients/[ref]/route.ts`, `pets/[ref]`,
   `grooming/appointments/photos`, and eleven others), but there is **no
   automated account-wide export or deletion**. Section 13.3 is therefore a
   placeholder. **Do not publish a data-return or deletion commitment you would
   have to satisfy by hand until you have decided you can.**

5. **No payment terms beyond the plan record.** There is no payment processor in
   the dependency tree — `stripe` appears nowhere in `package.json`.
   `facility_subscriptions` records a tier, an amount in cents, a cycle and a
   status, and that status gates access; nothing charges a card. The draft says
   so plainly rather than implying automated billing.

6. **No service-level or uptime commitment**, because none is implemented or
   measured. A public status page exists (`/status`), which is a communication
   channel, not an SLA. Add one only if you intend to be bound by it.

7. **No rate-limit or fair-use clause.** No rate limiting exists in
   `src/app/api` or `src/lib`. A clause reserving the right to impose limits
   could reasonably be added; a clause describing limits that exist would be
   false today.

8. **No content-moderation promise.** Nothing screens uploads. Section 6 says
   this explicitly so the absence is not mistaken for an omission.

9. **Several marketed features are not yet durable.** Gift cards, loyalty
   programmes, reputation/reviews, messaging campaigns, waivers and customer
   agreements have **no database tables** — the 70 tables in `public` do not
   include them. They appear in the interface backed by fixture data. The draft
   makes no representation about them. If any of these ship before publication,
   revisit sections 5, 7 and 8.

### Findings that shaped operative clauses

10. **Tenancy is enforced in the database, not the UI.** Row-level security
    scopes every read and write to the signed-in identity's membership; a
    Customer record is unique per `(facility_id, lower(email))`. This supports
    section 5's separation statement — stated as a control we operate, not as a
    warranty, because section 12 disclaims warranties.

11. **Suspension preserves data.** `private.member_facility_ids()` and
    `private.has_permission()` both exclude suspended and cancelled facilities,
    so operation stops platform-wide at once; `facilities_read` deliberately
    still admits the owner so they can see the facility and its billing status.
    Section 13.1 describes exactly this, and it is a genuine commercial
    advantage worth stating accurately.

12. **Facility deletion is superadmin-only.** Platform `support` cannot delete a
    facility; only `superadmin` can. Section 13.1 reflects the separation.

13. **AI is narrow and gated.** Three routes, all `claude-haiku-4-5-20251001`,
    capped at 300–500 output tokens, all requiring a session and a facility
    context, all disabled when `ANTHROPIC_API_KEY` is absent
    (`src/app/api/ai/generate-text/route.ts:8,80,94-95`). Section 9 is scoped to
    that reality — it does not disclaim "AI decisions" the product never makes.

14. **Outbound email is transactional only.** Five Resend senders: admin
    invitation, facility-owner invitation, staff invitation, MFA setup, and
    status-page subscription. There is no marketing or bulk-messaging engine, so
    no consent-to-marketing clause is included for Yipyy's own sending. The
    Facility's Twilio use is addressed separately in section 10 because that
    _is_ a channel to third parties.

15. **An immutable audit trail exists.** `public.audit_log` refuses UPDATE,
    DELETE and TRUNCATE for every role including the table owner, and records
    facility provisioning, subscription-status changes, platform-role grants,
    invitations and access changes. Consider whether you want to _rely_ on this
    contractually — it is good evidence in a dispute, and saying so creates an
    expectation that it keeps working.

### Before publishing

- Have a qualified attorney in the chosen jurisdiction review this in full.
- Write the Privacy Policy alongside it; sections 7 and 10 depend on it, and
  this Service processes personal data about people who never agreed to
  anything with Yipyy (a Facility's customers and staff).
- Decide the DPA question in section 7 — B2B customers will ask.
- Re-audit before each material release. Findings 4, 5 and 9 are the ones most
  likely to change first, and each of them would change what these Terms may
  truthfully say.
