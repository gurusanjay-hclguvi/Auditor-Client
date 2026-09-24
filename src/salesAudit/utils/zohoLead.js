import { CREDIT_TYPES } from './leadStatus'
import { toCategoryKey } from './recheckStatus'

// Maps the Zoho lead document (one per lead, with financialDetails / partialReminders /
// subscriptionReminders / EMIdetails nested) to the lead the pages use. Every API response that
// carries a lead goes through here, in mock mode and against the backend.
//
// Zoho quirks handled here: `balaceAmount` and `partialStaus` are spelled that way; owners are
// plain emails; `paymentUrl` is an HTML <a> string; dates are "YYYY-MM-DD" (IST). `recordId`
// values are larger than JavaScript can hold exactly, so the backend must send them as strings.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const IST_OFFSET = '+05:30'

const text = (value) => (value == null ? '' : String(value).trim())
const amount = (value) => (value === '' || value == null ? '' : String(value))

// "2026-01-01" or "2026-02-01 10:00:02.0" -> Unix seconds (IST); null when unreadable.
export function parseZohoDate(value) {
  const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!match) return null
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match
  const ms = Date.parse(`${year}-${month}-${day}T${hour}:${minute}:${second}${IST_OFFSET}`)
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000)
}

// "2026-01-01" -> "01-Jan-2026"; anything else is returned as it is.
export function displayZohoDate(value) {
  const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return text(value)
  const [, year, month, day] = match
  return `${day}-${MONTHS[Number(month) - 1]}-${year}`
}

// `<a href= "https://rzp.io/x" …>…</a>` (or a bare URL) -> "https://rzp.io/x"; only http(s).
export function extractLink(value) {
  const raw = text(value)
  const href = raw.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? raw
  return /^https?:\/\//i.test(href.trim()) ? href.trim() : ''
}

const sortByDate = (field) => (a, b) => (parseZohoDate(a[field]) ?? 0) - (parseZohoDate(b[field]) ?? 0)

// One row per financialDetails record, oldest first. `addedAt` / `verifiedAt` use exact
// timestamps when the backend adds them, else the payment / verified dates.
export function toPayments(raw) {
  return [...(raw.financialDetails ?? [])].sort(sortByDate('paymentDate')).map((record) => ({
    id: text(record.recordId),
    leadId: text(raw.superleapId),
    type: text(record.type),
    amount: amount(record.amount),
    paymentDate: displayZohoDate(record.paymentDate),
    verified: text(record.verified),
    verifiedDate: displayZohoDate(record.verifiedDate),
    modeOfPayment: text(record.zbModeOfPayment),
    paymentId: text(record.utrPaymentId),
    receiptCreated: text(record.zbReceiptCreated),
    addedAt: record.addedAt ?? parseZohoDate(record.paymentDate),
    verifiedAt:
      record.verifiedAt ?? (text(record.verified) === 'Yes' ? parseZohoDate(record.verifiedDate) : null),
  }))
}

// The planned installments: partial reminders for split plans, subscription reminders for
// subscriptions. `status` is Zoho's (Inactive = closed); dates stay "YYYY-MM-DD" for sorting.
export function toSchedule(raw) {
  const partial = raw.partialReminders ?? []
  const subscription = raw.subscriptionReminders ?? []
  const kind = partial.length ? 'partial' : subscription.length ? 'subscription' : null
  const items = (kind === 'partial' ? partial : subscription)
    .map((reminder) => ({
      id: text(reminder.recordId),
      number: text(reminder.noOfPartial ?? reminder.noOfSubscription ?? reminder.numberOfSubscription),
      amount: amount(reminder.amount),
      dueDate: text(reminder.dueDate),
      // partialpaymentStatus "Paid" once the learner pays; partialStaus Active / Inactive otherwise
      status: text(
        reminder.partialpaymentStatus ?? reminder.partialStaus ?? reminder.subscriptionStatus,
      ),
      paidOn: displayZohoDate(reminder.paidDateTime),
      linkStatus: text(reminder.linkStatus),
      paymentUrl: extractLink(reminder.paymentUrl),
    }))
    .sort(sortByDate('dueDate'))
  return { kind, items }
}

// EMIdetails: the loan application with the EMI vendor (key names from Zoho's export). Fields
// the export doesn't carry yet (relationship, disbursement date, remarks) are read if present;
// a rejected application's `droppedCategory` (e.g. "Low Cibil") stands in for remarks.
const pick = (record, ...keys) => keys.map((key) => record[key]).find((value) => value != null && value !== '')

export function toEmi(raw) {
  const emi = raw.EMIdetails?.[0]
  if (!emi) return null
  const rupees = (value) => (value == null ? '' : `₹${value}`)
  const roi = pick(emi, 'ROIinPercentage', 'roi')
  const tenure = pick(emi, 'tenorInMonth', 'tenureInMonths', 'tenure')
  const creatorName = text(pick(emi, 'applicationCreatorName'))
  const creatorEmail = text(pick(emi, 'applicationCreatorEmail'))
  return {
    vendor: text(pick(emi, 'emiVendor', 'vendor')),
    status: text(pick(emi, 'emiStatus', 'status')),
    stage: text(pick(emi, 'stage')),
    applicationId: text(pick(emi, 'applicationId', 'appId')),
    applicationCreatedBy: [creatorName, creatorEmail].filter(Boolean).join(' · '),
    applicationCreatedOn: displayZohoDate(pick(emi, 'applicationDate', 'appCreatedDate')),
    applicantName: text(pick(emi, 'applicationInTheNameOf', 'applicantName')),
    coApplicantName: text(pick(emi, 'coApplicantName')),
    coApplicantEmail: text(pick(emi, 'coApplicantEmail', 'coApplicantMailId')),
    relationship: text(pick(emi, 'relationship')),
    tenure: tenure == null ? '' : `${tenure} months`,
    roi: roi == null ? '' : `${roi}%`,
    loanAmount: rupees(pick(emi, 'loanAmount')),
    monthlyEmi: rupees(pick(emi, 'firstEMIamount', 'monthlyEmi')),
    disbursedAmount: rupees(pick(emi, 'disbursalAmount', 'disbursedAmount')),
    disbursedOn: displayZohoDate(pick(emi, 'disbursementDate', 'disbursalDate')),
    batchCode: text(pick(emi, 'batchCode')),
    remarks: text(pick(emi, 'remarks', 'droppedCategory')),
    dueDate: text(pick(emi, 'dueDate')),
  }
}

// Latest record of each credit type (by payment date), as the lead's `credits`.
function getCredits(payments) {
  return Object.fromEntries(
    Object.entries(CREDIT_TYPES).map(([key, type]) => {
      const latest = payments.filter((payment) => payment.type === type).at(-1)
      return [
        key,
        latest
          ? { amount: latest.amount, verified: latest.verified, paymentDate: latest.paymentDate }
          : null,
      ]
    }),
  )
}

// The lead's discount. The discount request (CourseDiscountDetails: requested vs actual fee, who
// asked, status) decides Approved / Requested; a lead with only a "Discount" credit note in
// financialDetails counts as Approved once the note is verified. null when there's no discount.
export const DISCOUNT_STATUS = { approved: 'Approved', requested: 'Requested' }

function getDiscount(raw, payments) {
  const request = raw.CourseDiscountDetails?.at(-1)
  const notes = payments.filter((payment) => payment.type === 'Discount')
  if (!request && !notes.length) return null
  const noteTotal = notes.reduce((total, record) => total + Number(record.amount || 0), 0)
  const notesVerified = notes.length > 0 && notes.every((record) => record.verified === 'Yes')
  const approved = request
    ? text(request.status).toLowerCase() === 'approved'
    : notesVerified
  return {
    status: approved ? DISCOUNT_STATUS.approved : DISCOUNT_STATUS.requested,
    zohoStatus: text(request?.status),
    amount: amount(request?.discountValue ?? noteTotal),
    actualCourseFee: amount(request?.actualCourseFee),
    requestedCourseFee: amount(request?.requestedCourseFee),
    requestedBy: text(request?.requestedperson),
    creditNotes: notes.map((record) => record.paymentId).filter(Boolean),
    creditNotesVerified: notesVerified,
  }
}

// recheckDetails: rechecks raised in Zoho (ticketStatus Open / Closed, one or more categories in
// pendingList). Mapped to the app's recheck shape; they carry no alert mails.
export function toRechecks(raw) {
  const leadId = text(raw.superleapId)
  return (raw.recheckDetails ?? []).map((recheck, index) => {
    const open = ['open', 'reopened', 'reopen'].includes(text(recheck.ticketStatus).toLowerCase())
    return {
      id: text(recheck.SRID) || `${leadId}-recheck-${index + 1}`,
      srId: text(recheck.SRID),
      leadId,
      categories: (recheck.pendingList ?? []).map(toCategoryKey).filter(Boolean),
      notes: text(recheck.auditComments),
      status: open ? 'open' : 'resolved',
      ticketStatus: text(recheck.ticketStatus),
      raisedBy: text(recheck.requestPerson),
      raisedAt: parseZohoDate(recheck.recheckDate),
      resolvedAt: open ? null : (recheck.resolvedAt ?? null),
      attempt: recheck.recheckattempt ?? null,
      newCcLink: text(recheck.newccLink),
      alert: null,
      source: 'zoho',
    }
  })
}

export function fromZohoLead(raw) {
  const payments = toPayments(raw)
  const discount = getDiscount(raw, payments)
  const emi = toEmi(raw)
  return {
    // Audit-side fields the backend adds (escalation, ccResponse, audit, sapEnteredAt, ...)
    escalation: raw.escalation ?? null,
    ccResponse: raw.ccResponse ?? null,
    audit: raw.audit ?? null,
    ccUploadedAt: raw.ccUploadedAt ?? null,

    id: text(raw.superleapId),
    studentFullName: text(raw.name).replace(/\s+/g, ' '),
    email: text(raw.email),
    primaryPhone: text(raw.phone),
    course: text(raw.product).replace(/_/g, ' '),
    courseValue: amount(raw.courseFee),
    discountGiven: discount?.amount ?? '',
    discount,
    paymentType: text(raw.paymenttype),
    partialSplitUpCategory: text(raw.partialCategory),
    totalPaid: amount(raw.totalPaid),
    balanceAmount: amount(raw.balaceAmount ?? raw.balanceAmount),
    saleOwner: text(raw.saleOwner),
    saleOwnerManager: text(raw.saleOwnerManager),
    // The auditor this lead is assigned to (email); drives the auditor's My Leads page
    auditCoordinator: text(raw.auditCoordinator),
    emiStatus: emi?.status ?? '',
    emiDetails: emi,
    financialDetailsTypes: [...new Set(payments.map((payment) => payment.type).filter(Boolean))],
    // Moves the lead from Sales Action Pending to Awaiting (see getLeadStage)
    allPaymentsVerified: payments.length > 0 && payments.every((payment) => payment.verified === 'Yes'),
    // The records keeping it in Sales Action Pending (any that aren't "Yes")
    unverifiedPayments: payments
      .filter((payment) => payment.verified !== 'Yes')
      .map(({ type, amount, verified, paymentDate }) => ({ type, amount, verified, paymentDate })),
    credits: getCredits(payments),
    confirmationCallLink: text(raw.confirmationCall),
    sapEnteredAt: raw.sapEnteredAt ?? parseZohoDate(raw.dateOfEnrollment),
    enrolledOn: displayZohoDate(raw.dateOfEnrollment),
    modeOfStudy: text(raw.modeOfStudy),
    preferredLanguage: text(raw.preferredLanguage),
    salesTeam: text(raw.salesTeam),
    leadSource: text(raw.source),
    status: text(raw.status),
    schedule: toSchedule(raw),
    zenId: text(raw.zenId),
    onboardCoordinator: text(raw.onboardCoordinator),
    paysInSameMonth: text(raw.willLeadPayinSameMonth),
    rechecks: toRechecks(raw),
  }
}
