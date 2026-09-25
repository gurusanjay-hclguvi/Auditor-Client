# Zen Sales Audit (frontend)

React feature for **Sales Audit**, built to merge into the Zen portal. It lives in `src/salesAudit/`. Everything else in `src/` is the dev shell that stands in for Zen.

The backend is `audit-checker-backend`. Its README describes the flow, the API and the data.

The flow, in short:
1. Leads come in from Zoho and are assigned to an auditor by region.
2. The auditor opens a lead and audits it: our database on the left, the confirmation call (PDF or call transcript) on the right, with a match / mismatch result per field.
3. The auditor then either:
   - completes the audit with a **checklist**, or
   - raises a **recheck**, which alerts the BDA and BDM and mails them the recheck ID.
4. The BDA fixes the issue and closes the ticket (the closer is recorded).
5. The auditor audits again. This repeats until the audit is completed.
6. Every step shows on the lead's timeline.

---

## 1. Getting started

Requirements: Node 18.20, npm, and the backend running (see its README for the seed and fake Zoho data).

```bash
npm install
cp .env.example .env.local   # VITE_BASE_URL=http://127.0.0.1:8080
npm run dev                  # http://localhost:5173
npm run lint
npm run build
```

| Variable | Default | Purpose |
|---|---|---|
| `VITE_BASE_URL` | `''` | Backend base URL, called directly (e.g. `http://127.0.0.1:8080`). The backend must allow CORS from the dev origin. |

There is no login. Pick a member in the app bar's **Mock user (dev)** picker. It lists the backend's `salesAuditMembers`, and the token becomes `dev-mock-token:<email>`. The default is the seeded auditor TL, `tl@example.com`.

## 2. Pages

| Page | Route | Roles | What it does |
|---|---|---|---|
| Team | `/sales-audit/team-dashboard` | Auditor TL | Per auditor: assigned, open, audits done, completed, rechecks raised in a period. Can filter to one auditor (day by day); shows recent audits. |
| Dashboard | `/sales-audit/dashboard` | BDA, BDM | Leads, audits completed, rechecks pending and closed, by category, and tickets to fix. A BDM sees every BDA under them and can pick one. |
| My Leads | `/sales-audit/my-leads` | Auditor, TL | Leads assigned to me |
| All Leads / Leads | `/sales-audit/leads` | all (scoped) | Every lead, from coming in to the audit being completed. Details below. |
| Lead | `/sales-audit/leads/:leadId` | all (scoped) | The lead's details, rechecks, audit attempts and timeline. Details below. |
| Audit | `/sales-audit/leads/:leadId/audit` | Auditor, TL | Side-by-side comparison, **CC verify**, **Checklist**, **Recheck**, and an "audit again" banner once a recheck is closed |
| CC verify | `/sales-audit/leads/:leadId/cc-verification` | Auditor, TL | Our record on the left; the PDF (Drive preview) or the call transcript on the right |
| Rechecks / Tickets | `/sales-audit/rechecks` | all (scoped) | Tickets and CC status. Details below. |
| Alerts | `/sales-audit/alerts` | all | Notifications: recheck raised or closed, leads assigned, CC updated. The app bar bell shows the unread count. |
| Members | `/sales-audit/members` | Auditor TL | Roster, and auditor availability for auto-assignment. Add a member. |

**All Leads / Leads**
- Shortcuts:
  - rechecks raised this month
  - raised & closed this or last month
  - completed last week
  - open rechecks
  - recheck closed with the audit pending
  - CC pending
- Filters: status, region, auditor, BDA, CC status, recheck category, and dates.
- Take up, for auditors.
- For the TL: **Sync from Zoho**, **Import Zoho file** and **Assign unassigned leads**.

**Lead**
- Four sections: Personal; Course; Payment & discount (payments, discounts, EMI, partials, subscriptions); Admission & T&C.
- Rechecks (with **Close ticket**) and audit attempts.
- The timeline.
- Audit, Take up, Reassign and payment reminder actions.

**Rechecks / Tickets**
- **Tickets**:
  - Filters: all / raised-not-closed / closed-audit-pending / closed; raised or closed this or last month; category; My leads vs All (auditors); BDA (BDM).
  - Close ticket; "Audit again".
- **CC status** (auditors): leads whose CC is updated in Zoho or still pending, with **Verify CC**.

Filters are in the URL, so filtered lists can be shared.

## 3. Project structure

```
src/salesAudit/
  apiCalls/salesAuditApi.js   every backend call (BaseUrl + Redux token)
  components/common/          PageHeader, PageState (loading / error / empty), DataTable, Chips,
                              SectionCard, StatTile, RoleGate, NotificationBell
  components/dialogs/         RaiseRecheck, CloseRecheck, Checklist, Reassign
  components/leads/           LeadsTable, LeadFilters, LeadSections, LeadTimeline
  components/rechecks/        RechecksTable
  pages/                      one file per route above
  utils/                      roles (GET /me, role gating), routePaths, labels, formatters,
                              leadFilters, useApi, useAction
  styles/tableSx.js
  routes.js                   [{ path, component: lazy page wrapped in RoleGate, permission, roles }]
  navItems.js                 [{ label, route, key, image, roles }]
```

Conventions:
- Plain JavaScript, React 18, MUI v5 and the Zen tokens (`#0d75fc`, Wanted Sans, the text colours in `src/theme.js`).
- Every page handles loading, empty and error states.
- The role comes from `GET /me`, never from the client. The backend enforces it again.
- Action buttons also need the `salesAudit.write` permission.

## 4. Changes outside the feature folder

These are all in the dev shell, which Zen replaces:
- **`src/App.jsx`**:
  - The **Mock user (dev)** picker now lists members from `GET /members`.
  - The app bar shows `NotificationBell`. On merge, Zen's header needs to render `salesAudit/components/common/NotificationBell`.
- **`src/store/commonDataSlice.js`**: the default dev token is `dev-mock-token:tl@example.com`. Older role-style dev tokens are ignored.
- **`vite.config.js`**: no dev proxy; requests go straight to `VITE_BASE_URL`.

## 5. Known gaps

- The CC transcript and the extracted CC fields are mocked by the backend until the transcription service exists. The CC verify page says so.
- Notifications refresh once a minute (polling), not live.
- There is no member deactivation in the UI. Availability covers "away".
- There are no screenshots yet (handover checklist).
