# CRM Implementation Plan

This document outlines the implementation plan for the Customer Relationship Management (CRM) feature for the PetCare Platform.

## Overview

The CRM module enables sales teams to manage leads, track deals, maintain contacts, and onboard new customers. It includes a visual pipeline, activity tracking, email templates, reporting, and team management.

---

## Phase 1: Foundation & Data Models ✅

### Data Files (`src/data/crm/`)

- [x] `leads.ts` - Lead types, statuses, sources, mock data
  - Lead interface with all required fields
  - Pipeline stages (8 total)
  - Lead sources (website, phone, referral, event, etc.)
  - Service types (boarding, daycare, grooming, training, veterinary)
  - Expected tier types (beginner, pro, enterprise, custom)
  - 12 mock leads with realistic data
  - Helper functions (getLeadById, getLeadsByStatus, etc.)

- [x] `deals.ts` - Deal types, stages, mock data
  - Deal interface with subscription tier, modules, value
  - Deal stages (qualification → closed won/lost)
  - 8 mock deals
  - Helper functions (getDealById, calculatePipelineValue, etc.)

- [x] `contacts.ts` - Contact types, mock data
  - Contact interface (name, title, email, phone, facility, tags)
  - Communication record interface
  - Contact tags (decision-maker, influencer, technical, etc.)
  - 12 mock contacts with communication history
  - Helper functions (getContactsByTag, getDecisionMakers, etc.)

- [x] `activities.ts` - Activity types (calls, emails, meetings)
  - Activity interface (type, subject, description, due date, etc.)
  - Task reminder interface
  - 15 mock activities
  - Helper functions (getPendingActivities, getOverdueActivities, etc.)

- [x] `sales-team.ts` - Sales rep data, assignments
  - Sales team member interface with performance metrics
  - Team goal interface
  - 5 mock team members with targets and performance data
  - 5 team goals (quarterly revenue, conversion rate, etc.)
  - Helper functions (getTeamLeaderboard, getTeamTotalRevenue, etc.)

- [x] `email-templates.ts` - Email template definitions
  - 7 template types (welcome, demo invite, proposal, follow-up, etc.)
  - Variable substitution support
  - renderTemplate function for variable replacement

- [x] `onboarding.ts` - Onboarding checklist items
  - 6 onboarding steps (contract, payment, training, data entry, staff, go-live)
  - 3 mock onboarding checklists with progress
  - Helper functions (getOnboardingProgress, getPendingOnboardings)

- [x] `index.ts` - Barrel export file

---

## Phase 2: Navigation & Pages ✅

### Sidebar Update

- [x] Added CRM section to `super-admin-sidebar.tsx` with 8 navigation items

### Pages (`src/app/dashboard/crm/`)

- [x] `/dashboard/crm/page.tsx` - CRM Overview
  - Sales metrics (8 cards)
  - Pipeline stage overview
  - Conversion funnel
  - Top opportunities
  - Quick actions
  - Activity feed (recent/upcoming)
  - Pending onboardings
  - Team performance summary

- [x] `/dashboard/crm/leads/page.tsx` - Lead Pipeline
  - Kanban board view with drag-and-drop
  - List view alternative
  - Search and filters (source, assignee)
  - Pipeline metrics
  - Add lead functionality

- [x] `/dashboard/crm/deals/page.tsx` - Deal Tracking
  - DataTable with all deals
  - Filters by stage and tier
  - Deal metrics (active, pipeline value, win rate, avg size)
  - Row actions (view, edit, delete)

- [x] `/dashboard/crm/contacts/page.tsx` - Contact Database
  - DataTable with all contacts
  - Contact tags overview
  - Decision maker filter
  - Contact detail modal with communication history
  - Metrics (total, decision makers, with facility)

- [x] `/dashboard/crm/activities/page.tsx` - Activity Log
  - Activity timeline with filters
  - Activity type breakdown (calls, emails, meetings, tasks)
  - Pending/completed tabs
  - Overdue alerts
  - Log activity functionality

- [x] `/dashboard/crm/onboarding/page.tsx` - Onboarding Workflows
  - Onboarding checklists (pending/completed)
  - Step-by-step progress tracking
  - Notes per step
  - Assignee filter
  - Progress metrics

- [x] `/dashboard/crm/reports/page.tsx` - Sales Reports
  - Pipeline analysis (bar chart, funnel)
  - Lead sources (pie chart, performance table)
  - Rep performance (revenue, conversion)
  - Monthly trends (line chart, area chart)
  - Date range filter
  - Export options (PDF, CSV)

- [x] `/dashboard/crm/team/page.tsx` - Team Management
  - Team overview metrics
  - Sales leaderboard with rankings
  - Team member performance cards
  - Team and individual goals
  - Period selector (monthly, quarterly, yearly)

---

## Phase 3: Core Components ✅

### CRM Components (`src/components/crm/`)

- [x] `SalesMetrics.tsx` - Dashboard metric cards
  - MetricCard component with trends and progress
  - 8 different metrics supported
  - Skeleton loading state

- [x] `ActivityTimeline.tsx` - Activity log with icons
  - Type and status filters
  - Relative time formatting
  - Activity icons and colors
  - Edit/complete/delete actions
  - Compact mode for sidebar

- [x] `LeadCard.tsx` - Lead card for pipeline
  - Contact info, value, close date
  - Tier badge with colors
  - Source badge
  - Assigned rep avatar
  - Probability indicator
  - Drag state styling

- [x] `LeadPipeline.tsx` - Drag-and-drop Kanban board
  - 8 pipeline columns
  - Drag and drop between stages
  - Stage value totals
  - Add lead per stage
  - List view alternative
  - View toggle component

- [x] `LeadForm.tsx` - Lead capture/edit form
  - All lead fields organized by section
  - Service and module checkboxes
  - Auto-calculate pricing by tier
  - Validation

- [x] `ConversionFunnel.tsx` - Funnel visualization
  - Visual funnel with progressive widths
  - Conversion percentages between stages
  - Summary statistics

- [x] `OnboardingChecklist.tsx` - Checklist with progress
  - Expandable/collapsible checklist
  - Step completion toggle
  - Notes per step
  - Progress bar
  - Completion status

- [x] `TeamLeaderboard.tsx` - Performance rankings
  - Team summary cards
  - Ranked leaderboard with medals
  - Progress bars for targets
  - Team goals display

- [x] `EmailTemplateEditor.tsx` - Template management
  - Template list view
  - Template editor with variable insertion
  - Live preview
  - Send email dialog with variable fill-in

### Modals (`src/components/modals/`)

- [x] `LeadModal.tsx` - Create/Edit lead wrapper
- [x] `ActivityModal.tsx` - Log activity form
  - Activity type selector
  - Assignee selector
  - Due date/time
  - Duration (for calls/meetings)
  - Reminder toggle
  - Mark complete option
- [x] `ConvertLeadModal.tsx` - Lead to customer conversion
  - Multi-step conversion flow
  - Subscription options (plan, billing cycle)
  - Conversion options (create account, send email, start onboarding)
  - Onboarding preview
  - Success confirmation

---

## Phase 4: Dependencies ✅

### New Packages Installed

- [x] `@dnd-kit/core` - Drag and drop core functionality
- [x] `@dnd-kit/sortable` - Sortable list utilities
- [x] `@dnd-kit/utilities` - CSS transform utilities

---

## Future Enhancements (Not Implemented)

### Phase 5: i18n Support

- [ ] Add CRM translations to `messages/en.json`
- [ ] Add CRM translations to `messages/fr.json`

### Phase 6: Advanced Features

- [ ] Email sending integration
- [ ] Calendar integration for meetings
- [ ] Task automation rules
- [ ] Lead scoring algorithm
- [ ] Custom fields configuration
- [ ] Import/Export functionality (actual implementation)
- [ ] Bulk actions on leads
- [ ] Lead assignment automation
- [ ] Activity notifications
- [ ] Pipeline customization (add/remove stages)

### Phase 7: Integrations

- [ ] Email service integration (SendGrid, etc.)
- [ ] Calendar sync (Google Calendar, Outlook)
- [ ] CRM data sync with facility module
- [ ] Webhook support for external systems

---

## File Structure

```
src/
├── app/dashboard/crm/
│   ├── page.tsx                 # CRM Overview ✅
│   ├── leads/page.tsx           # Lead Pipeline ✅
│   ├── deals/page.tsx           # Deal Tracking ✅
│   ├── contacts/page.tsx        # Contact Database ✅
│   ├── activities/page.tsx      # Activity Log ✅
│   ├── onboarding/page.tsx      # Onboarding Workflows ✅
│   ├── reports/page.tsx         # Sales Reports ✅
│   └── team/page.tsx            # Team Management ✅
├── components/crm/
│   ├── SalesMetrics.tsx         ✅
│   ├── ActivityTimeline.tsx     ✅
│   ├── LeadCard.tsx             ✅
│   ├── LeadPipeline.tsx         ✅
│   ├── LeadForm.tsx             ✅
│   ├── ConversionFunnel.tsx     ✅
│   ├── OnboardingChecklist.tsx  ✅
│   ├── TeamLeaderboard.tsx      ✅
│   └── EmailTemplateEditor.tsx  ✅
├── components/modals/
│   ├── LeadModal.tsx            ✅
│   ├── ActivityModal.tsx        ✅
│   └── ConvertLeadModal.tsx     ✅
└── data/crm/
    ├── index.ts                 ✅
    ├── leads.ts                 ✅
    ├── deals.ts                 ✅
    ├── contacts.ts              ✅
    ├── activities.ts            ✅
    ├── sales-team.ts            ✅
    ├── email-templates.ts       ✅
    └── onboarding.ts            ✅
```

---

## Summary

| Phase   | Status      | Description                |
| ------- | ----------- | -------------------------- |
| Phase 1 | ✅ Complete | Data models and mock data  |
| Phase 2 | ✅ Complete | Navigation and pages       |
| Phase 3 | ✅ Complete | Core components and modals |
| Phase 4 | ✅ Complete | Dependencies (dnd-kit)     |
| Phase 5 | ⏳ Pending  | i18n translations          |
| Phase 6 | ⏳ Pending  | Advanced features          |
| Phase 7 | ⏳ Pending  | External integrations      |

**Total Files Created:** 27

- 7 data files
- 9 component files
- 3 modal files
- 8 page files
