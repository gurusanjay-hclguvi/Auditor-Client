# Zen Sales Audit (frontend)

A feature module for the **Zen portal** that automates the sales-audit work that is done today by
hand in Zoho Creator, the mail inbox and vendor portals. It gives the **auditor** one place to see
which leads still need verification, compare what was promised to the learner with what was
recorded, raise **rechecks**, and follow up. It gives each **BDA** (Business Development Associate)
a to-do list and the alerts raised on their leads, and it keeps **BDMs** (managers) and
**Accounts** in the loop through (currently simulated) alert mails.

> Status: runs against the Go backend (`audit-checker-backend`, files prefixed `sales_audit`) or,
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
| 5 | Once Accounts has verified every payment, the lead is in **Awaiting**; the auditor audits it there and, if everything matches, marks it audited. | Auditor | Zoho |
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
| 5 – Audit in Awaiting | Leads → **Awaiting Audit** tab → Lead Audit Workspace → **Mark audited** | A lead reaches Awaiting automatically when every payment record is verified "Yes"; only then can it be audited. Enabled when the checklist passes, otherwise needs an override reason |
| 6 – Raise recheck | **Raise recheck** from any mismatch or failed check in the workspace (pre-filled), or from **Rechecks** | Category and notes are generated from the mismatch ("CC mail says ₹22500, Zoho says ₹22000"); **alert mailed to the lead's BDA and BDM**; **automatic reminder** every 24h while it stays open |
| 7 – Follow-up | **BDA View** (to-do list, alerts), **Audit Overview** (trends, patterns, response times, per-BDA table) | Prioritised to-do list for each BDA; repeat-issue detection and turnaround tracking for the auditor |

Still manual or simulated: reading the real CC mail, real vendor data, and sending real mail.
See [section 12](#12-known-gaps-and-next-steps).

## 3. Pages

All routes live under `/sales-audit` and require the `salesAudit.view` permission. Actions that
change data (send mail now, raise/resolve recheck, update CC, mark verified) additionally need
`permission.salesAudit.write`.

### Auth (starter kit) and roles — `utils/roles.js`, `components/common/RoleGate.jsx`
There is **no login** in the app (RULES.md): Zen's shell — in dev, the starter-kit stub store —
holds the token (`state.reducers.commonData.authToken`) and permissions. Every API call sends
`Authorization: <token>` (no `Bearer`); the backend's mock auth middleware turns it into `auth`
(user hash) and `program`. Who the user is comes from **`GET /sales-audit/me`** →
`{ hash, name, email, role }`, loaded once per token. Pages and nav are gated by
`permission.salesAudit.read / .write`; on top of that every page is wrapped in `RoleGate`
(`routes.js`), which loads the user and shows "This page isn't available for your role" when the
role doesn't match, so the role rules hold inside Zen's shell too. The role decides what they see:

| Role | Nav | Can open |
|---|---|---|
| **Auditor** | My Leads · All Leads · Audit Overview · Rechecks | Every audit page and every student page. **No BDA View.** |
| **BDM** | BDA View | Their team's leads: "Viewing as" **Home · all my BDAs** (everything added up, plus a per-BDA table) or one BDA under them. Student pages of their team's leads only. |
| **BDA** | BDA View | Their own leads only (no picker). Student pages of their own leads only. |

A BDM's team is every lead whose `saleOwnerManager` is them; a BDA's leads are those whose
`saleOwner` is them (`canSeeLead`). Opening another team's student page by URL shows "This lead
isn't one of yours". Pages a role can't use are left out of the nav; opening one by URL shows the
role notice with a link to the role's own page. Student pages go back to Leads (auditor) or BDA View (BDA/BDM);
*Open audit* shows for the auditor only.

**Trying the roles in dev:** the stub token names a mock user (`dev-mock-token:<email>`); the
**Mock user (dev)** picker in the app bar swaps it (the dev stand-in for logging in as someone
else) and opens that role's home. The app starts as `auditor1@example.com`. Mock users
(`apiCalls/mocks/users.js`) come from the mock leads: auditors `auditor1…3@example.com` (from
`auditCoordinator`), BDMs `manager1…11@example.com`, BDAs `owner1…39@example.com`.

Nav order: **My Leads · All Leads · Audit Overview · Rechecks** (auditor) or **BDA View** (BDA/BDM). The Lead
Audit Workspace, student and CC pages are opened from rows and buttons.

### My Leads / All Leads — `/sales-audit/my-leads`, `/sales-audit/leads` (`?tab=pending|awaiting|audited`)
`pages/MyLeads.jsx` and `pages/Leads.jsx` (same page; My Leads keeps only leads whose
`auditCoordinator` is the signed-in auditor), table in `components/salesTable/SalesActionTable.jsx`.
Auditors land on My Leads; All Leads shows every lead, including unassigned ones.

- **Tabs:** *Sales Action Pending* (a payment isn't verified yet, or nothing paid) · *Awaiting
  Audit* (every payment verified; audit these) · *Audited*, each with a count.
- **Summary chips (pending tab):** Paid, not verified · Mismatch · Overdue >24h.
- **Columns:** **Audit** (opens the Lead Audit Workspace in Awaiting; *View* once audited;
  disabled in Sales Action Pending), student, contact, course, fee, discount, payment type, split category, total paid,
  balance, sale owner (BDA), sale owner manager (BDM), audit coordinator, then:
  - **Down Payment / Initial Payment / Remaining Balance** — amount (links to that payment in the
    drill-down) + status chip (`components/leads/CreditStatusCell.jsx`).
  - EMI details, partial reminders, subscription reminders (Yes/No, linked drill-downs).
  - **CC Link → Verify** (opens *Check source PDF* when the lead has a CC link).
  - Pending tab only: **Time in SAP** (red after 24h) and **Escalation** — "Mailed BDA & Accounts ·
    date" (hover for recipients) or "Auto-mail in 5h"; a **send-now** button for users with write
    access (`components/leads/EscalationCell.jsx`).
- **Columns** dropdown (above the table): a checkbox per column to show or hide it, plus *Show all
  columns*. *Audit* and *Student Name* always stay. The choice is remembered in this browser
  (`localStorage`), for both My Leads and All Leads (`components/common/ColumnPicker.jsx`,
  `utils/useColumnVisibility.js`).
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
- **Mark audited** (write, Awaiting leads only): one click when every check passes; otherwise
  *Mark audited with override…* asks for a reason, which is shown on the lead afterwards. The lead
  moves to Audited. A lead still in Sales Action Pending opens read-only with a notice.

### Student detail — `/sales-audit/students/:studentId`
`pages/StudentDetail.jsx` — the lead's profile (contact, course, enrolled on, mode of study,
language, sales team, lead source, BDA / BDM, Zen ID, audit coordinator, onboard coordinator,
pays in same month; discount as Approved / Requested), Yes/No flags with drill-down links, *Check source*
when a CC link exists, and *Open audit* (auditor). Below it, **Payment details**
(`components/payments/PaymentDetails.jsx`):
- **Summary:** payment type, split category, course fee, discount, total paid, balance, and the
  **next payment** — due date and amount (Upcoming / Overdue), *Fully paid* when no balance is
  left, *Covered by EMI* with the monthly EMI, tenure, vendor and status for EMI plans, *No
  payment plan recorded yet* when Zoho has no balance (payment type null), or a warning when a
  balance is owed but nothing is scheduled (`utils/paymentSchedule.js`).
- **EMI details** (EMI payment types only, `components/payments/EmiDetails.jsx`): EMI vendor,
  EMI status, application ID, created by / on, applicant and co-applicant (name, email,
  relationship), loan amount, tenure, ROI, monthly EMI, disbursed amount and date, remarks. The
  student email is already at the top of the page, so it isn't repeated.
- **What has been paid:** one row per `financialDetails` record — payment (Down payment, Initial
  payment, Remaining balance, EMI disbursal, Discount, Subscription N), amount, paid on, mode,
  payment/UTR id, verified, verified on.
- **Partial payment schedule** or **Subscription schedule:** the reminders with number, due
  date, amount, status (*Paid* or *Closed* as Zoho marks it Paid / Inactive; an Active one is
  Upcoming or Overdue) and the payment link. The next payment is the earliest Active reminder.

### Student payments — `/sales-audit/students/:studentId/payments?category=…`
`pages/StudentPayments.jsx` — the lead's transactions filtered by tab: All · Down Payment · EMI ·
Partial Payments · Remaining Balance · Subscription · Discount (`utils/paymentCategories.js`).

### Check source — `/sales-audit/students/:studentId/cc-verification`
`pages/CcVerification.jsx`, opened from *Check source PDF*
(`components/ccVerification/CheckSourceButton.jsx`) on the Lead Audit Workspace and the Student
detail page when the lead has a `confirmationCallLink` (the backend's field; Zoho's
`confirmationCall`). For now every CC is treated as a **PDF**; call recordings aren't
supported. Left: the **database record** (Zoho) grouped into Personal / Course / Payment
details (`components/ccVerification/RecordPanel.jsx`); payment fields adapt to the payment mode
(installment count from the split category, e.g. `40-30-30` → 3; EMI loan terms; or both). Right:
the **CC PDF** from cloud storage in an embedded frame, with *Open in new tab*
(`components/ccVerification/SourcePdfPanel.jsx`). The page scrolls the record while the PDF stays in
view. The link decides how it is framed (`utils/pdfSource.js`): a **Google Drive** link
(`/file/d/<id>/view`, `open?id=`, `uc?id=`, Docs `/d/<id>/edit`) is shown through Drive's
embeddable `/preview` page, and the viewer needs access to the file (shared "anyone with the link",
or signed in to Google with access); an **S3** (or other direct) link is framed as it is, so S3 must
serve the PDF inline (`Content-Type: application/pdf`) and allow framing. Only http(s) links are
used. *Open in new tab* always opens the original link.

### Rechecks — `/sales-audit/rechecks?tab=rechecks|cc&status=…&category=…`
`pages/Rechecks.jsx`

- **Rechecks tab (auditor):** rechecks raised in the app **and** the ones Zoho sends inside each
  lead (`recheckDetails`: SR ID, attempt, open / closed ticket), with raised date, student,
  **categories** (one or more chips), issue, SR ID · attempt, raised by, BDA, BDM, the alert mail
  sent, and status. Zoho tickets are closed in Zoho, so they have no *Mark resolved*. Filter by **category** chips (with counts) and
  **Open / Resolved / All**. `status` and `category` can be passed in the URL (the Audit Overview
  links use this).
  - **Raise recheck** (write): choose lead → shows which BDA and BDM will be alerted →
    **categories** (multi-select with checkboxes; a recheck can cover several) →
    description → *Raise & alert BDA/BDM* (`components/rechecks/RaiseRecheckDialog.jsx`).
  - **Mark resolved** on open rechecks (write).
  - The *Alert* column also shows the automatic "Reminded (open >24h)" mail.
- **CC Status tab:** every lead with **Completed** (links to *Check source PDF*) or **Pending**.
  Clicking *Pending* (write) opens the CC modal (`components/rechecks/CcPendingDialog.jsx`) —
  "Mail sent, acknowledgement not received" or "Mail not sent yet" (alerts the BDA).

### BDA View — `/sales-audit/bda?bda=<email>&tab=todo|cc|alerts` (BDA and BDM only)
`pages/BdaView.jsx` — the BDA's own workspace. A **BDA** sees only their leads. A **BDM** gets a
**"Viewing as"** picker: **Home · all my BDAs** (the default) adds up every BDA under them and
shows a **Your BDAs** table (leads, to-dos, urgent, open rechecks, CCs pending, *View BDA*), with
a BDA column in the to-do and alert lists; picking a BDA (`?bda=<email>`) shows that BDA's view.
The auditor can't open it.

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
- **Sales Action Pending** while any `financialDetails` record isn't verified "Yes" (Mismatch,
  blank…), or when nothing has been paid.
- **Awaiting** (Audit) as soon as every record is verified "Yes" (`allPaymentsVerified`, set by
  `utils/zohoLead.js`). Auditing happens only here.
- **Audited** once the auditor marks it audited (`lead.audit`: `auditedAt`, `auditedBy`,
  `overrideReason`). See `getLeadStage` in `utils/leadStatus.js`.
- Escalation mails and the BDA's "payments to get verified" list cover every record that isn't
  "Yes", including discount credit notes.

### Audit checklist and mismatches — `utils/auditChecks.js`
- Values are compared trimmed, case-insensitive, ignoring spaces and commas. A row with only one
  source is not a mismatch.
- **Required CC points** (`REQUIRED_CC_POINTS`): total fee, payment plan, batch start date, batch
  timing and mode, medium of instruction, refund policy.
- **Mismatch → recheck category:** EMI fields → *EMI*; down payment → *Down Payment*; other payment
  fields → *Payment*; personal/course fields → *Missed points in CC*; no CC → *CC Pending*;
  missing CC points → *Missed points in CC*; unverified/mismatched credit → *Down Payment* or
  *Payment*; a discount whose credit note isn't verified → *Approval*. Notes
  list what each source says.
- **Discount approved:** the lead's discount request (`CourseDiscountDetails`, sent for partial
  plans paid in the same month) must be *Approved*; without a request, a `Discount` credit note
  counts once verified. Otherwise the item fails (→ *Approval* recheck); n/a without a discount.
  The Leads table and the student page show the discount as **Approved** / **Requested** (hover
  for amount, actual → requested fee and who asked) instead of Yes / No.
- The verify button needs every item to pass or be n/a; otherwise an override reason.

### 24h SAP escalation — `utils/leadStatus.js`, `apiCalls/mocks/mailSimulator.js`
- A lead **needs escalation** when it is in SAP and any credit is *Unverified* or *Mismatch*.
  Leads that have paid nothing are not escalated (nothing for Accounts to verify).
- After **24h in SAP** (`sapEnteredAt`) it is mailed to the **BDA and Accounts**, at most once per
  24h. Users with write access can also send it immediately.

### Rechecks — `utils/recheckStatus.js`
- Categories: **CC Pending · Payment · EMI · Approval · Missed points in CC · Down Payment**. A
  recheck has one or more (`categories`). Zoho's `pendingList` labels map onto them
  ("Confirmation Call" → CC Pending, "Discount Approval" → Approval, …; `toCategoryKey`); an
  unknown label is kept and shown as it is. Filters and Overview patterns count a recheck under
  each of its categories.
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
| `apiCalls/mocks/zohoLeads.json`, `apiCalls/mocks/students.js` | 57 leads from a real Zoho export, anonymized by `scripts/anonymizeZohoSample.mjs` (fake names, contacts, ids, payment references and links; admission details dropped). `students.js` shifts every date by the same number of days so the latest payment is yesterday, adds `ccUploadedAt`, and maps the leads through `utils/zohoLead.js` into `MOCK_STUDENTS` / `MOCK_PAYMENTS` | Every real case: EMI 6 / 12 / 18 / 24 Month (Disbursed and Rejected applications, with vendors and dropped reasons such as "Low Cibil"), Direct - Full / Partial Payment, Intra Month Partial with discounts, Active / Inactive / Paid reminders, Mismatch payments; statuses converted / not converted / dropped; CC links as the sample PDF (standing in for S3 files and, for now, recordings), Drive files and bad links |
| `apiCalls/mocks/ccVerification.js` | Generated for every lead with a CC: system side from the lead, scraped side a copy | A mismatch on every fourth CC (phone, medium, fee or EMI); every fifth misses the refund policy |
| `apiCalls/mocks/vendorEmi.js` | Generated vendor copy of each EMI lead's application | Every third one quotes a different monthly EMI |
| `apiCalls/mocks/audits.js` | Auditor verify decisions | stu-1001 verified; stu-1010 verified with an override reason |
| `apiCalls/mocks/rechecks.js` | Current rechecks + CC responses, each on a lead picked by what fits (a Mismatch payment, no CC, an EMI with a CC, no down payment); merges history | Open and resolved; one "mail sent" and one "mail not sent" CC response |
| `apiCalls/mocks/history.js` | 15 resolved rechecks over ~8 weeks, past escalation mails | Repeat rechecks on stu-1002 and stu-1005 |
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
| GET | `/leads/:id/audit` | view | Lead Audit Workspace — sources, rechecks |
| POST | `/leads/:id/mark-audited` | edit | Mark audited (Awaiting → Audited) — `{ overrideReason }`; only for leads whose payments are all verified |
| GET | `/rechecks` | view | Rechecks, BDA View |
| POST | `/rechecks` | edit | Raise recheck — `{ leadId, categories: [...], notes }` |
| POST | `/rechecks/:id/resolve` | edit | Mark resolved |
| GET | `/audit-history` | view | Audit Overview, BDA patterns — rechecks, payments, alert mails (60 days) |
| GET | `/students/:id`, `/students/:id/cc-verification` | view | Student pages (payments come inside the lead), Check source |

Where the data comes from: every lead is one **Zoho lead document** (`superleapId`, `name`,
`financialDetails`, `partialReminders`, `subscriptionReminders`, `EMIdetails`, `confirmationCall`,
…) that a backend worker stores; the full shape is in `API_ENDPOINTS.md`. The frontend maps it in
one place, `utils/zohoLead.js` (`fromZohoLead`, `toPayments`, `toSchedule`), so pages keep their
field names. Credits, the discount and payment rows are computed from `financialDetails`.
The backend adds the audit-side fields (`sapEnteredAt`, `escalation`, `ccResponse`, `audit`).

## 8. Project structure

```
src/
  App.jsx, main.jsx            dev shell standing in for the Zen portal (nav + permission gating)
  store/                       dev stand-in for Zen's commonData slice (user, token, permissions)
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

There is no login: pick a user in the app bar's **Mock user (dev)** picker to try the auditor,
BDM and BDA views; every mock user can use the edit actions its pages offer.

## 11. Changes outside the feature folder

Only in the dev shell, which Zen replaces:

- `src/App.jsx` — nav buttons are keyed by `item.route` instead of `item.key`, because every nav
  item shares the permission key `salesAudit`.
- `vite.config.js` — dev proxy `/api` → backend (`DEV_API_TARGET`).
- `src/store/commonDataSlice.js` — starter-kit stub: dev token `dev-mock-token:<email>` and
  `permission.salesAudit: { read: true, write: true }`, plus a dev-only `setAuthToken`. Nothing is
  stored in the browser.
- `src/App.jsx` — no login; routes gated by permission; the dev nav also follows the role from
  `GET /me`; the **Mock user (dev)** picker. On merge Zen's shell replaces both files; the feature
  only needs Zen (or the backend) to serve `GET /sales-audit/me` with the user's `role` and
  `email`.

## 12. Known gaps and next steps

### Built to close the earlier gaps
The **Lead Audit Workspace** now covers what was missing: the auditor explicitly audits a lead
once it reaches Awaiting, one checklist shows everything that is checked,
the EMI vendor is compared, any mismatch becomes a pre-filled recheck in one click, and open
rechecks are chased every 24h.

### Running against the deployed backend
`.env` / `.env.example` point the dev proxy at **https://audit-checker-backend.onrender.com**
(`VITE_USE_MOCK_API=false`, `VITE_BASE_URL=/api`, `DEV_API_TARGET=<render URL>`); `npm run dev`
then serves the real data through the Vite proxy (`changeOrigin` is set for the hosted backend).
Set `VITE_USE_MOCK_API=true` to go back to the mock data. What the frontend does with the
backend's current responses (`apiCalls/salesAuditApi.js`, `utils/zohoLead.js`):
- **Leads** come back flat (`id`, `studentFullName`, `credits`, …) rather than as the Zoho
  document; `normalizeLead` accepts both. "Every payment verified" (Awaiting) is judged from the
  three credits, the only payment data on the lead.
- **Payments** (`/students/:id/payments`) are mapped with `normalizePayment`; the discount on the
  audit page comes from the audit's `discount` request (Approved / Requested); the lead lists show
  only whether a discount was given.
- **`/sales-audit/me` doesn't exist yet:** the frontend falls back to the dev token, which names
  the user (`dev-mock-token:<role>:<email>`). The Mock user picker lists the BDAs / BDMs on the
  backend's leads plus `auditor1@example.com`.
- **Rechecks** hold one category in the backend: the first picked category is sent as `category`
  and the rest are named in the notes ("Also: …"); `categories` is sent too.
- **Check source** uses the backend's `cc-verification` when a CC has been extracted, otherwise
  the lead's own record and its `confirmationCallLink`.
- Not in the backend's lead yet, so empty against it: payment schedule (partial / subscription
  reminders), EMI application details, `auditCoordinator` (My Leads stays empty; use All Leads),
  Zoho `recheckDetails`, Zen ID / onboard coordinator.
- **Production:** the backend sends no CORS headers (and RULES.md forbids widening CORS), so a
  deployed frontend must reach it through a same-origin proxy (as the dev server does) or be
  served from the same host.

### Remaining gaps
- **Zoho cases:** the payment types are Direct - Full Payment, Direct - Partial Payment, Intra
  Month Partial and EMI - 6 / 12 / 18 / 24 Month, or null. No Subscription or EMI + Partial case
  exists, so no mock uses them (the code still handles them). EMI leads record a `Credit_Part1`,
  so "Initial payment verified" applies to them too.
- **Mock data from a real export:** `random.json` (git-ignored, real personal data) is turned into
  `mocks/zohoLeads.json` with `node scripts/anonymizeZohoSample.mjs random.json
  src/salesAudit/apiCalls/mocks/zohoLeads.json`. Re-run it for a newer export; never commit the
  raw file.
- **Zoho lead shape — assumptions to confirm:** the lead id is `superleapId`; `courseFee` is the fee
  after discount (in the sample the two credits add up to it, and the `Discount` credit note makes
  `totalPaid` 5000 higher); a reminder with `partialStaus: "Inactive"` is closed; the SAP clock
  falls back to `dateOfEnrollment` until the backend adds `sapEnteredAt`. `EMIdetails` keys
  now come from the real export (`toEmi` in `utils/zohoLead.js`). Of the EMI fields the business
  asked for, relationship, disbursement date and remarks aren't in the export yet (the rejection
  reason `droppedCategory` is shown as remarks). `subscriptionReminders` never appears in the
  export, so its keys are still guesses. `admissionDetails` isn't shown.
1. **The CC mail is not parsed.** With the backend, the CC column is empty (the "CC matches Zoho" and
   "required points" checks show n/a) until the backend / AI service fills
   `salesAuditCcExtracts` (RULES.MD allows AI only via the Go backend).
   Mock mode still shows extracted CC data.
2. **No real EMI vendor feed.** The vendor column is the `EmiData` loan application.
3. **Roles are enforced in the frontend only.** The backend doesn't know the user's role yet, so
   it returns every lead to anyone with a token; it needs Zen's user (role + email) to scope
   `/leads`, `/students/*` and the write actions server side. Audits are recorded as "Audit Team".
4. **Mock mode only:** mails, `ccUploadedAt`, payment timestamps, audits and the alert log reset on
   reload. With the backend they are stored and mails are sent when SMTP is configured.
5. **Personal/course mismatches map to "Missed points in CC"** — the closest of the six
   categories; a dedicated "Wrong details in CC" category may be worth adding.
6. **No "undo audit"** — once a lead is Audited it can't be sent back from the UI.
7. The pending-CC list appears both in *Rechecks → CC Status* (auditor) and *BDA View → CC
   Updates* (BDA) — intentional for now.

### Later (backend-dependent)
- Parse the real CC mail in the backend / AI service.
- Auditor / BDA / BDM roles from Zen permissions.
- Vendor (EMI) and payment-gateway (Razorpay / EaseBuzz / PineLabs) integrations to verify
  payments automatically.
