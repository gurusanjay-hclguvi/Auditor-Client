# Zen Sales Audit (frontend)

A feature module for the **Zen portal** that automates the sales-audit work that is done today by
hand in Zoho Creator, the mail inbox and vendor portals. It gives the **auditor** one place to see
which leads still need verification, compare what was promised to the learner with what was
recorded, raise **rechecks**, and follow up. It gives each **BDA** (Business Development Associate)
a to-do list and the alerts raised on their leads, and it keeps **BDMs** (managers) and
**Accounts** in the loop through (currently simulated) alert mails.

> Status: runs against the Go backend (`audit-checker-backend`, feature folder `salesAudit/`) or,
> by default, on in-browser **mock data**. See [Mock data](#6-mock-data-and-simulated-mail) and
> [API contract](#7-api-contract).

---

## Contents

1. [The audit flow today and the problem](#1-the-audit-flow-today-and-the-problem)
2. [How the platform maps to the flow](#2-how-the-platform-maps-to-the-flow)
3. [Pages](#3-pages)
4. [Business rules](#4-business-rules)
5. [Alerts and mails](#5-alerts-and-mails)
6. [Mock data and simulated mail](#6-mock-data-and-simulated-mail)
7. [API contract](#7-api-contract)
8. [Project structure](#8-project-structure)
9. [Tech stack and conventions](#9-tech-stack-and-conventions)
10. [Getting started](#10-getting-started)
11. [Changes outside the feature folder](#11-changes-outside-the-feature-folder)
12. [Known gaps and next steps](#12-known-gaps-and-next-steps)

---

## 1. The audit flow today and the problem

| # | Step | Who | Today |
|---|---|---|---|
| 1 | A sale is made and the lead lands in **Sales Action Pending (SAP)**: leads whose details and payments have not been verified yet. | BDA | Zoho Creator |
| 2 | The BDA sends the learner a mail with every deal detail (course, batch, fee, split or EMI terms, policies). The auditor is **cc'd**; this mail is "the CC" and its link is stored on the lead as the *Confirmation Call link*. | BDA | Mail |
| 3 | The auditor opens each SAP lead and checks everything is there: payments received and verified by Accounts (down payment, initial payment, remaining balance), CC sent. | Auditor | Zoho + mail, by hand |
| 4 | The auditor compares the **CC mail** with the **Zoho record** field by field. For EMI deals they also compare against the **EMI vendor's data** (loan amount, monthly EMI, ROI…). Other sources are checked as needed. | Auditor | Several tabs and portals, by hand |
| 5 | If everything matches, the auditor verifies the lead and it moves to **Awaiting**. | Auditor | Zoho |
| 6 | If anything is wrong, the auditor raises a **recheck** and mails the person responsible (BDA, BDM). | Auditor | Manual mail |
| 7 | The BDA fixes the issue and the auditor re-checks. Nobody reliably chases what is stuck. | BDA / Auditor | Memory and follow-up calls |

**The problem:** every step is manual, spread over several tools, nothing chases stuck leads or
open rechecks, and nobody can see which issues keep repeating or which BDA needs help.

## 2. How the platform maps to the flow

| Flow step | Where in the app | What is automated |
|---|---|---|
| 1 – SAP list | **Leads** → *Sales Action Pending* tab | The list, each payment's verification status, time spent in SAP |
| 3 – Payments verified? | **Leads** credit columns, **Student → Payments** | Status per credit (Verified / Unverified / Mismatch / Refund / Not paid); **auto-mail to the BDA and Accounts after 24h** in SAP with an unverified or mismatched payment |
| 2/3 – CC sent? | **Rechecks → CC Status**, **BDA View → CC Updates** | CC is *Completed* if the CC link exists, else *Pending*; the BDA reports "mail sent, no acknowledgement" or "mail not sent" — the latter **alerts the BDA automatically** |
| 3/4 – Check everything, compare CC vs Zoho vs EMI vendor | **Lead Audit Workspace** (per lead, *Audit* button on Leads) | Zoho · CC mail · EMI vendor side by side, every field matched across sources; an **auto-ticked audit checklist** (payments, CC uploaded, CC matches Zoho, required CC points covered, EMI matches vendor, no open rechecks). **CC Verification** remains as the two-panel CC view |
| 5 – Move to Awaiting | Lead Audit Workspace → **Mark verified → Awaiting** | The auditor decides; enabled when the checklist passes, otherwise needs an override reason |
| 6 – Raise recheck | **Raise recheck** from any mismatch or failed check in the workspace (pre-filled), or from **Rechecks** | Category and notes are generated from the mismatch ("CC mail says ₹22500, Zoho says ₹22000"); **alert mailed to the lead's BDA and BDM**; **automatic reminder** every 24h while it stays open |
| 7 – Follow-up | **BDA View** (to-do list, alerts), **Audit Overview** (trends, patterns, response times, per-BDA table) | Prioritised to-do list for each BDA; repeat-issue detection and turnaround tracking for the auditor |

Still manual or simulated: reading the real CC mail, real vendor data, and sending real mail.
See [section 12](#12-known-gaps-and-next-steps).

## 3. Pages

All routes live under `/sales-audit` and require the `salesAudit.view` permission. Actions that
change data (send mail now, raise/resolve recheck, update CC, mark verified) additionally need
`permission.salesAudit.write`.

Nav order: **Leads · Audit Overview · Rechecks · BDA View**. The Lead Audit Workspace, student
and CC pages are opened from rows and buttons.

### Leads — `/sales-audit/leads?tab=pending|awaiting`
`pages/Leads.jsx`, table in `components/salesTable/SalesActionTable.jsx`

- **Tabs:** *Sales Action Pending* and *Awaiting*, each with a count.
- **Summary chips (pending tab):** Paid, not verified · Mismatch · Overdue >24h.
- **Columns:** **Audit** (opens the Lead Audit Workspace; *View* once verified), student, contact, course, fee, discount, payment type, split category, total paid,
  balance, sale owner (BDA), sale owner manager (BDM), then:
  - **Down Payment / Initial Payment / Remaining Balance** — amount (links to that payment in the
    drill-down) + status chip (`components/leads/CreditStatusCell.jsx`).
  - EMI details, partial reminders, subscription reminders (Yes/No, linked drill-downs).
  - **CC Link → Verify** (opens CC Verification when the lead has a CC link).
  - Pending tab only: **Time in SAP** (red after 24h) and **Escalation** — "Mailed BDA & Accounts ·
    date" (hover for recipients) or "Auto-mail in 5h"; a **send-now** button for users with write
    access (`components/leads/EscalationCell.jsx`).
- A toast reports how many auto-escalation mails were sent when the page loaded.
- "Time in SAP" ticks every minute without refetching.

### Lead Audit Workspace — `/sales-audit/leads/:studentId/audit`
`pages/LeadAudit.jsx`, components in `components/audit/`, logic in `utils/auditChecks.js` —
the whole audit of one lead on one screen.

- **Header:** time in SAP (red after 24h) or "Verified by … · date"; BDA, BDM and EMI vendor
  chips; links to lead details, all payments and the two-panel CC view.
- **Payment strip:** down payment, initial payment and remaining balance with their status, each
  linked to its transactions.
- **Source comparison:** one table per section (Personal / Course / Payment / EMI), one column per
  source that exists for the lead — **Zoho**, **CC mail**, **EMI vendor** (EMI payment types
  only). Each row is *Match*, *Mismatch* (differing values in red), *Only in …* or *For
  reference* (shown, not compared, e.g. loan status). **Raise recheck** on every mismatch row
  (write).
- **Audit checklist** (sticky on the right), each item ticked automatically with its reason:
  down payment verified · initial payment verified (n/a for EMI-only and subscription plans) ·
  remaining balance verified (n/a until paid) · CC mail uploaded (shows the BDA's CC answer) · CC
  mail matches Zoho · all required points in the CC · EMI terms match the vendor (EMI only) ·
  discount approved (n/a without a discount) · no open rechecks. Failing items offer **Raise
  recheck** (pre-filled) or a link.
- **Mark verified → Awaiting** (write): one click when every check passes; otherwise *Verify with
  override…* asks for a reason, which is shown on the lead afterwards.

### Student detail — `/sales-audit/students/:studentId`
`pages/StudentDetail.jsx` — the lead's profile, Yes/No flags with drill-down links, every
transaction, *Verify CC* when a CC link exists, and *Open audit*.

### Student payments — `/sales-audit/students/:studentId/payments?category=…`
`pages/StudentPayments.jsx` — the lead's transactions filtered by tab: All · Down Payment · EMI ·
Partial Payments · Remaining Balance · Subscription (`utils/paymentCategories.js`).

### CC Verification — `/sales-audit/students/:studentId/cc-verification`
`pages/CcVerification.jsx` — two panels, **System data** (lead record) vs **CC data** (extracted
from the confirmation call), grouped into Personal / Course / Payment details. Payment fields adapt
to the payment mode: full, partial and subscription installments (count from the split category,
e.g. `40-30-30` → 3), EMI loan terms, or EMI + partial. Each field is green (match) or amber
(mismatch); the header shows "N fields flagged". Comparison: trimmed, case-insensitive
(`utils/compareLeadData.js`, fields in `utils/compareFields.js`).

### Rechecks — `/sales-audit/rechecks?tab=rechecks|cc&status=…&category=…`
`pages/Rechecks.jsx`

- **Rechecks tab (auditor):** list of rechecks with raised date, student, category, issue, raised
  by, BDA, BDM, the alert mail sent, and status. Filter by **category** chips (with counts) and
  **Open / Resolved / All**. `status` and `category` can be passed in the URL (the Audit Overview
  links use this).
  - **Raise recheck** (write): choose lead → shows which BDA and BDM will be alerted → category →
    description → *Raise & alert BDA/BDM* (`components/rechecks/RaiseRecheckDialog.jsx`).
  - **Mark resolved** on open rechecks (write).
  - The *Alert* column also shows the automatic "Reminded (open >24h)" mail.
- **CC Status tab:** every lead with **Completed** (links to CC Verification) or **Pending**.
  Clicking *Pending* (write) opens the CC modal (`components/rechecks/CcPendingDialog.jsx`) —
  "Mail sent, acknowledgement not received" or "Mail not sent yet" (alerts the BDA).

### BDA View — `/sales-audit/bda?bda=<email>&tab=todo|cc|alerts`
`pages/BdaView.jsx` — the BDA's own workspace. Until Zen provides the logged-in user, a
**"Viewing as"** picker selects the BDA.

- **To do:**
  - Four tiles that filter the list: **Payments to get verified** (how many are over 24h),
    **Open rechecks** (change vs last week), **CCs to update**, **Balance to follow up**
    (₹ outstanding).
  - A **prioritised to-do list** — each row: priority, student, what to do, why, one action
    button ("View payments", "View lead", "Open CC", or **Update CC** which opens the CC modal in
    place). See [priorities](#action-priorities-bda-to-do).
  - **Your patterns & response times** (last 30 days): the BDA's repeat issues and their median
    turnaround vs the 24h target. Hidden when there is nothing to say.
- **CC Updates:** the BDA's leads with CC status, pending ones first; update via the CC modal.
- **Alerts:** every mail raised on the BDA's leads — auditor rechecks, SAP-over-24h mails
  (automatic or sent manually), CC-not-sent reminders, recheck-overdue reminders — with
  **Action needed / Cleared** status.
  Filters: All · Action needed · From auditor · Automated.

### Audit Overview — `/sales-audit/overview?days=7|30`
`pages/AuditOverview.jsx` — the auditor's top view, built from history. **No charts by design:**
every block leads to an action.

- **Trend tiles** (current vs previous period, spelled out as better/worse, each linking to the
  records): Rechecks raised · Rechecks resolved · Open rechecks · SAP over-24h mails · Payment
  mismatches.
- **Patterns to act on:** repeat issues with evidence and a suggested follow-up, plus links
  (view lead / view those rechecks / open the BDA view).
- **Response times:** recheck resolution, payment verification and CC upload — median, share
  within 24h, change vs previous period — and the **oldest items still open**, each linked.
- **By BDA:** open rechecks (and their change), payments >24h unverified, CCs to update, median
  recheck resolution; sorted by most open issues; *Open BDA view* per row.

## 4. Business rules

### Credits (payments that decide verification) — `utils/leadStatus.js`
| Source `Type` | Meaning | Column |
|---|---|---|
| `Credit_Booking_Amount` | Down payment | Down Payment |
| `Credit_Part1` | Initial payment | Initial Payment |
| `Credit_RemainingBalance` | Remaining amount after the initial payment | Remaining Balance |

The latest record of each type is used. Its `Verified` value maps to a status:
`Yes` → **Verified**, `Mismatch` → **Mismatch**, `Refund` → **Refund**, empty → **Unverified**;
no record → **Not paid**.

### Stage
- **Awaiting** once an auditor marks the lead verified in the Lead Audit Workspace (`lead.audit`:
  `auditedAt`, `auditedBy`, `overrideReason`); otherwise **Sales Action Pending**
  (`getLeadStage`). Payment status feeds the checklist, not the stage, so EMI and full-payment
  leads can be verified too.

### Audit checklist and mismatches — `utils/auditChecks.js`
- Values are compared trimmed, case-insensitive, ignoring spaces and commas. A row with only one
  source is not a mismatch.
- **Required CC points** (`REQUIRED_CC_POINTS`): total fee, payment plan, batch start date, batch
  timing and mode, medium of instruction, refund policy.
- **Mismatch → recheck category:** EMI fields → *EMI*; down payment → *Down Payment*; other payment
  fields → *Payment*; personal/course fields → *Missed points in CC*; no CC → *CC Pending*;
  missing CC points → *Missed points in CC*; unverified/mismatched credit → *Down Payment* or
  *Payment*; discount given without an approved request of the same amount → *Approval*. Notes
  list what each source says.
- **Discount approved:** when the lead has `discountGiven`, its latest discount request
  (DiscountData) must be *Approved* for the same amount.
- The verify button needs every item to pass or be n/a; otherwise an override reason.

### 24h SAP escalation — `utils/leadStatus.js`, `apiCalls/mocks/mailSimulator.js`
- A lead **needs escalation** when it is in SAP and any credit is *Unverified* or *Mismatch*.
  Leads that have paid nothing are not escalated (nothing for Accounts to verify).
- After **24h in SAP** (`sapEnteredAt`) it is mailed to the **BDA and Accounts**, at most once per
  24h. Users with write access can also send it immediately.

### Rechecks — `utils/recheckStatus.js`
- Categories: **CC Pending · Payment · EMI · Approval · Missed points in CC · Down Payment**.
- Raising one mails the lead's **BDA and BDM**. Status: Open → Resolved.
- While open, the BDA and BDM are **reminded every 24h** (from raise time or the last reminder;
  `runRecheckReminderSweep` in `apiCalls/mocks/mailSimulator.js`).

### CC status — `utils/recheckStatus.js`, `utils/bdaMetrics.js`
- **Completed** if the lead has a Confirmation Call link, else **Pending**.
- BDA response for a pending CC: *Mail sent, acknowledgement not received* (no alert) or *Mail not
  sent yet* (**BDA is alerted automatically**).
- A pending CC still needs the BDA unless they reported the mail as sent.

### Action priorities (BDA to-do) — `utils/bdaMetrics.js` `buildActionItems`
| Priority | Label | Item |
|---|---|---|
| 1 | Urgent | Payment unverified/mismatched and **over 24h** in SAP (Accounts already mailed) |
| 2 | Urgent | Open auditor recheck |
| 3 | Today | CC pending (mail not sent, or no update given) |
| 4 | Today | Payment unverified, under 24h (shows time until auto-mail) |
| 5 | Follow up | Balance outstanding |

Sorted by priority, then oldest first.

### History metrics — `utils/auditHistory.js`
- **Periods:** last N days (7 or 30) vs the N days before.
- **Trends:** rechecks raised (lower is better), resolved (higher is better), open at period end,
  SAP escalation mails, payment mismatches (by payment `addedAt`).
- **Response times** against a **24h target** (`RESPONSE_TARGET_HOURS`):
  recheck resolution (`raisedAt → resolvedAt`), payment verification (`addedAt → verifiedAt`),
  CC upload (`sapEnteredAt → ccUploadedAt`). Median, % within target, oldest open items.
- **Repeat patterns** (current period):
  - same recheck category **≥ 2** times on one BDA's leads → category-specific suggestion;
  - one lead with **≥ 2** rechecks → review the whole lead;
  - **≥ 2** payment mismatches for one BDA → check payment modes/amounts shared;
  - a BDA's median recheck resolution over 24h (≥ 2 samples) → follow up with BDA and BDM.

## 5. Alerts and mails

| Alert | Trigger | Recipients | Where it shows |
|---|---|---|---|
| SAP over 24h | Automatic sweep when Leads data loads; or *send now* | BDA + Accounts | Leads escalation column, BDA alerts, Overview trend |
| Recheck raised | Auditor raises a recheck (workspace or Rechecks page) | BDA + BDM | Rechecks list, BDA alerts & to-do |
| Recheck overdue | Automatic, every 24h while a recheck stays open | BDA + BDM | Rechecks *Alert* column, BDA alerts |
| CC mail not sent | BDA answers "mail not sent" | BDA | CC Status / CC Updates, BDA alerts |

With the backend, every mail is logged (recipients, subject, auto/manual, time) and sent by its
Redis worker over SMTP; the two sweeps run hourly. In mock mode mails are only recorded in the
browser and the sweeps run when the data loads.

## 6. Mock data and simulated mail

`VITE_USE_MOCK_API` defaults to mock mode; set it to `false` to call the backend for every
endpoint in [section 7](#7-api-contract). All mock state lives in memory and
**resets on page reload**. All data is fake (no real PII). Timestamps are relative to "now", so
the demo always shows overdue and not-yet-due cases.

| File | Holds | Deliberate cases |
|---|---|---|
| `apiCalls/mocks/students.js` | 10 leads across 3 BDAs, with `sapEnteredAt`, `ccUploadedAt` | Verified → Awaiting (Aarav, Tara); unverified >24h (Diya); mismatch >24h (Ishaan); unverified <24h (Sana); down payment unverified (Nila); nothing paid (Varun); EMI leads (Meera, Rohan) |
| `apiCalls/mocks/payments.js` | 18 transactions with `addedAt` / `verifiedAt` | Slow verifications, one mismatch, remaining-balance record |
| `apiCalls/mocks/ccVerification.js` | System vs CC data for leads with a CC, and the required points each CC covered | One injected mismatch per lead (amount, phone, EMI, medium); Sana's CC misses the refund policy |
| `apiCalls/mocks/vendorEmi.js` | EMI vendor records for Meera, Rohan, Sana | Sana's vendor monthly EMI differs from Zoho; Rohan's CC differs from Zoho and vendor |
| `apiCalls/mocks/audits.js` | Auditor verify decisions | Aarav verified; Tara verified with an override reason |
| `apiCalls/mocks/discounts.js` | Latest discount request per lead | Aarav approved; Meera still pending |
| `apiCalls/mocks/rechecks.js` | 5 current rechecks + CC responses; merges history | Open and resolved; one "mail not sent" CC response |
| `apiCalls/mocks/history.js` | 15 resolved rechecks over ~8 weeks, past escalation mails | Sales Owner Two: repeat Payment rechecks; Diya: several rechecks; Sales Owner Three: slow resolution |
| `apiCalls/mocks/mailSimulator.js` | The SAP sweep, recheck reminders, manual reminders, mail log | Once-per-24h rule |

In mock mode, `getLeadAudit()` builds the Zoho side from the CC record's system data when there is
one, else from the lead fields.

## 7. API contract

Implemented by the Go backend (`audit-checker-backend/salesAudit`); full shapes in
[`API_ENDPOINTS.md`](API_ENDPOINTS.md). All calls go through `apiCalls/salesAuditApi.js`, prefixed
with `/sales-audit`, send `Authorization: <token>` (from Redux), and expect
`{status: "success", data}` / `{status: "error", message}`.

| Method | Path | Permission | Used by |
|---|---|---|---|
| GET | `/leads` | view | Leads, BDA View, Overview — leads with `credits`, `escalation`, `ccResponse`, `audit`, `sapEnteredAt`, `ccUploadedAt` |
| GET | `/leads/summaries` | view | Rechecks (lead picker, CC Status) |
| POST | `/leads/:id/send-reminder` | edit | Send-now escalation |
| POST | `/leads/:id/cc-response` | edit | CC modal — `{ response: "mailSentAwaitingAck" \| "mailNotSent" }` |
| GET | `/leads/:id/audit` | view | Lead Audit Workspace — sources, rechecks, `discount` |
| POST | `/leads/:id/mark-audited` | edit | Mark verified → Awaiting — `{ overrideReason }` |
| GET | `/rechecks` | view | Rechecks, BDA View |
| POST | `/rechecks` | edit | Raise recheck — `{ leadId, category, notes }` |
| POST | `/rechecks/:id/resolve` | edit | Mark resolved |
| GET | `/audit-history` | view | Audit Overview, BDA patterns — rechecks, payments, alert mails (60 days) |
| GET | `/students/:id`, `/students/:id/payments`, `/students/:id/cc-verification` | view | Student pages, CC Verification |

Where the data comes from: leads are `LeadData` records in the Zoho `Audit` stage (SAP clock =
`Added_Time`), credits from `paymentData`, the EMI vendor side from `EmiData`, installment plans
from `PartialReminders` / `SubscriptionReminders`, the discount check from `DiscountData`. See the
backend README for the mapping and its known gaps.

## 8. Project structure

```
src/
  App.jsx, main.jsx            dev shell standing in for the Zen portal (nav + permission gating)
  store/                       dev stand-in for Zen's commonData slice (token, permissions)
  salesAudit/                  ← the feature; everything ships from here
    routes.js                  [{ path, component: lazy(...), permission }]
    navItems.js                [{ label, route, key, image }]
    pages/                     Leads, LeadAudit, StudentDetail, StudentPayments,
                               CcVerification, Rechecks, BdaView, AuditOverview
    components/
      common/                  DataTable, PageHeader, PageState (loading/empty/error),
                               MailAlertStatus, TrendDelta, YesNoCell
      leads/                   CreditStatusCell, EscalationCell, VerificationChip
      salesTable/              SalesActionTable (Leads table)
      payments/                PaymentsTable
      comparison/              ComparisonPanel, FieldRow (CC verification)
      rechecks/                RechecksTable, RaiseRecheckDialog, CcStatusTable, CcPendingDialog
      bda/                     ActionTile, ActionList, AlertsTable
      overview/                TrendTile, PatternList, ResponseTimesTable, BdaSummaryTable
      audit/                   SourceComparison, AuditChecklist, PaymentStrip, MarkVerifiedDialog
    apiCalls/
      salesAuditApi.js         the only API helper (mock switch lives here)
      mocks/                   see section 6
    utils/
      leadStatus.js            credits, verification status, stage, 24h escalation
      auditChecks.js           N-source comparison, audit checklist, mismatch → recheck
      recheckStatus.js         recheck categories/status, CC status and responses
      bdaMetrics.js            BDA options, action items, alert feed
      auditHistory.js          trends, response times, repeat patterns, per-BDA summary
      compareFields.js, compareLeadData.js   CC verification fields and comparison
      paymentCategories.js     payments drill-down tabs
      salesFlags.js            Yes/No flags on the Leads table
      contacts.js              "Name - email" parsing
      formatters.js            ₹, dates (DD-Mon-YYYY HH:mm), durations, percent
      routePaths.js            every route and link builder
      useApi.js                fetch hook with loading/error/reload, token from Redux
    styles/tableSx.js          shared table/overline styles
    assets/                    nav icons
```

## 9. Tech stack and conventions

Follows `RULES.MD` (Zen portal build rules):

- React 18, **plain JavaScript**, MUI v5, Redux Toolkit, react-router v6, axios, Vite. No new
  libraries were added.
- Zen design tokens: primary `#0d75fc`, font Wanted Sans, text `#1F252D` / `#495565` / `#5E7087`
  (`src/theme.js`).
- API calls only through `apiCalls/salesAuditApi.js`; URLs from `BaseUrl`; token read from
  `state.reducers.commonData.authToken`; nothing stored in `localStorage`.
- Pages and nav gated by `permission.salesAudit.read` / `.write`.
- Every screen handles loading, empty and error states (`components/common/PageState.jsx`).
- Status is never shown by colour alone — chips and trends always carry a text label.
- Analytics are **action-first**: numbers link to or filter the records behind them; no charts
  that can't be acted on.

## 10. Getting started

Requirements: Node 18.20, npm.

```bash
npm install
npm run dev      # http://localhost:5173 → redirects to the first permitted route
npm run lint
npm run build
```

Environment variables (optional, in `.env.local`):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_BASE_URL` | `''` | Backend base URL for real API calls (`/api` with the dev proxy) |
| `VITE_USE_MOCK_API` | mock on | Set to `false` to call the real API |
| `DEV_API_TARGET` | `http://127.0.0.1:8080` | Where the Vite dev server proxies `/api/*` (dev only) |

To run against the backend: start it (`go run main.go` in `audit-checker-backend`), then
`cp .env.example .env.local` and `npm run dev`. The proxy strips `/api`, so the backend needs no
CORS changes.

To try the edit actions (send now, raise/resolve recheck, update CC, mark verified) locally, set
`salesAudit.write: true` in `src/store/commonDataSlice.js` (dev store only).

## 11. Changes outside the feature folder

Only in the dev shell, which Zen replaces:

- `src/App.jsx` — nav buttons are keyed by `item.route` instead of `item.key`, because every nav
  item shares the permission key `salesAudit`.
- `vite.config.js` — dev proxy `/api` → backend (`DEV_API_TARGET`).
- `src/store/commonDataSlice.js` — dev token and permissions (`salesAudit: { read: true,
  write: false }`); unchanged, flip `write` to test edit actions.

## 12. Known gaps and next steps

### Built to close the earlier gaps
The **Lead Audit Workspace** now covers what was missing: the auditor explicitly verifies a lead
(EMI and full-payment leads can reach Awaiting), one checklist shows everything that is checked,
the EMI vendor is compared, any mismatch becomes a pre-filled recheck in one click, and open
rechecks are chased every 24h.

### Remaining gaps
1. **The CC mail is not parsed.** With the backend, the CC column is empty (the "CC matches Zoho" and
   "required points" checks show n/a) and CC Verification returns "not extracted yet" until the
   backend / AI service fills `salesAuditCcExtracts` (RULES.MD allows AI only via the Go backend).
   Mock mode still shows extracted CC data.
2. **No real EMI vendor feed.** The vendor column is the `EmiData` loan application.
3. **No auditor vs BDA roles** — one `salesAudit` permission; the BDA View uses a "Viewing as"
   picker until Zen provides the logged-in user. Audits are recorded as "Audit Team".
4. **Mock mode only:** mails, `ccUploadedAt`, payment timestamps, audits and the alert log reset on
   reload. With the backend they are stored and mails are sent when SMTP is configured.
5. **Personal/course mismatches map to "Missed points in CC"** — the closest of the six
   categories; a dedicated "Wrong details in CC" category may be worth adding.
6. **No "undo verify"** — once a lead is in Awaiting it can't be sent back to SAP from the UI.
7. The pending-CC list appears both in *Rechecks → CC Status* (auditor) and *BDA View → CC
   Updates* (BDA) — intentional for now.

### Later (backend-dependent)
- Parse the real CC mail in the backend / AI service.
- Auditor / BDA / BDM roles from Zen permissions.
- Vendor (EMI) and payment-gateway (Razorpay / EaseBuzz / PineLabs) integrations to verify
  payments automatically.
