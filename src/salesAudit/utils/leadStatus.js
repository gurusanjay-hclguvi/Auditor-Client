import { getPaymentMode } from './auditChecks'

// Lead verification rules for the Leads page. A lead's three credits are the down payment
// (Credit_Booking_Amount), the initial payment (Credit_Part1) and the remaining balance
// (Credit_RemainingBalance); each is null when unpaid, else { amount, verified, paymentDate }.
export const ESCALATION_AFTER_HOURS = 24
const ESCALATION_AFTER_MS = ESCALATION_AFTER_HOURS * 60 * 60 * 1000

export const CREDIT_TYPES = {
  bookingAmount: 'Credit_Booking_Amount',
  part1: 'Credit_Part1',
  remainingBalance: 'Credit_RemainingBalance',
}

// Sales Action Pending until Accounts has verified every payment record; then Awaiting audit,
// where the auditor checks the lead; Audited once the auditor verifies it.
export const LEAD_STAGES = {
  pending: 'pending',
  awaiting: 'awaiting',
  audited: 'audited',
}

export const VERIFICATION_CHIP = {
  verified: { label: 'Verified', color: 'success' },
  unverified: { label: 'Unverified', color: 'warning' },
  mismatch: { label: 'Mismatch', color: 'error' },
  refund: { label: 'Refund', color: 'default' },
  notPaid: { label: 'Not paid', color: 'default' },
}

const VERIFIED_VALUES = { Yes: 'verified', Mismatch: 'mismatch', Refund: 'refund' }

// Maps a financial record's raw `Verified` value ("Yes" | "Mismatch" | "Refund" | "").
export function getVerificationStatus(verified) {
  return VERIFIED_VALUES[verified] ?? 'unverified'
}

export function getCreditStatus(credit) {
  return credit ? getVerificationStatus(credit.verified) : 'notPaid'
}

function creditStatuses(lead) {
  return Object.keys(CREDIT_TYPES).map((key) => getCreditStatus(lead.credits?.[key]))
}

// Verified money a lead needs before it can be audited, by payment plan. Amounts are the
// verified payments (`verifiedPaidAmount`, set by utils/zohoLead.js) against the course fee.
export const SUBSCRIPTION_MIN_PAID = 15000 // includes the ₹999 registration fee
export const EMI_MIN_PAID_SHARE = 0.4

// null when the plan's threshold is met, else why the lead can't be audited yet. Partial plans
// have no threshold beyond every payment being verified.
export function getPaymentShortfall(lead) {
  const paid = Number(lead.verifiedPaidAmount) || 0
  const fee = Number(lead.courseValue) || 0
  switch (getPaymentMode(lead.paymentType)) {
    case 'full':
      return fee > 0 && paid >= fee ? null : 'Full payment not received and verified'
    case 'subscription':
      return paid >= SUBSCRIPTION_MIN_PAID
        ? null
        : `Subscription needs ₹${SUBSCRIPTION_MIN_PAID} verified (incl. ₹999 registration)`
    case 'emi':
    case 'emiPartial':
      return fee > 0 && paid >= fee * EMI_MIN_PAID_SHARE
        ? null
        : `EMI needs ${EMI_MIN_PAID_SHARE * 100}% of the course fee verified`
    default:
      return null
  }
}

// Why a lead in Sales Action Pending can't be audited yet.
export function getPendingReason(lead) {
  if (!lead.allPaymentsVerified) return 'Auditing starts once Accounts has verified every payment'
  return getPaymentShortfall(lead)
}

// A lead moves to Awaiting once every financialDetails record is verified "Yes"
// (`allPaymentsVerified`, set by utils/zohoLead.js) and its plan's verified amount is met (see
// getPaymentShortfall); otherwise it stays in Sales Action Pending. The auditor can only audit
// from Awaiting; their decision (`lead.audit`) makes it Audited.
export function getLeadStage(lead) {
  if (lead.audit) return LEAD_STAGES.audited
  return lead.allPaymentsVerified && !getPaymentShortfall(lead)
    ? LEAD_STAGES.awaiting
    : LEAD_STAGES.pending
}

export const canAudit = (lead) => getLeadStage(lead) === LEAD_STAGES.awaiting

export function hasCreditStatus(lead, status) {
  return creditStatuses(lead).includes(status)
}

// Only leads with money paid but not cleanly verified are escalated; unpaid leads have nothing
// for Accounts to verify. Any payment record that isn't "Yes" counts, as it keeps the lead in
// Sales Action Pending.
export function needsEscalation(lead) {
  const hasUnverifiedRecord =
    lead.allPaymentsVerified === false && lead.financialDetailsTypes?.length > 0
  return (
    getLeadStage(lead) === LEAD_STAGES.pending &&
    (hasUnverifiedRecord || hasCreditStatus(lead, 'unverified') || hasCreditStatus(lead, 'mismatch'))
  )
}

// `sapEnteredAt` is Unix seconds; `nowMs` is milliseconds.
export function getSapAgeMs(lead, nowMs) {
  return lead.sapEnteredAt ? Math.max(0, nowMs - lead.sapEnteredAt * 1000) : 0
}

export function isSapOverdue(lead, nowMs) {
  return getSapAgeMs(lead, nowMs) > ESCALATION_AFTER_MS
}

export function getMsUntilEscalation(lead, nowMs) {
  return Math.max(0, ESCALATION_AFTER_MS - getSapAgeMs(lead, nowMs))
}
