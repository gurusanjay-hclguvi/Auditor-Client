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

export const LEAD_STAGES = {
  pending: 'pending',
  awaiting: 'awaiting',
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

// A lead leaves Sales Action Pending only when an auditor marks it verified (`lead.audit`, set
// from the Lead Audit Workspace). Payment status feeds the audit checklist, not the stage.
export function getLeadStage(lead) {
  return lead.audit ? LEAD_STAGES.awaiting : LEAD_STAGES.pending
}

export function hasCreditStatus(lead, status) {
  return creditStatuses(lead).includes(status)
}

// Only leads with money paid but not cleanly verified are escalated; unpaid leads have nothing
// for Accounts to verify.
export function needsEscalation(lead) {
  return (
    getLeadStage(lead) === LEAD_STAGES.pending &&
    (hasCreditStatus(lead, 'unverified') || hasCreditStatus(lead, 'mismatch'))
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
