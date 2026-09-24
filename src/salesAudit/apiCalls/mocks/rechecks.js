// Fake rechecks and CC responses. Planned backend shapes:
//
// GET /sales-audit/rechecks -> [recheck]
//   recheck  { id, leadId, categories, notes, status: "open" | "resolved", raisedBy,
//              raisedAt, resolvedAt, alert }   (timestamps are Unix seconds)
//   categories one or more keys of RECHECK_CATEGORIES (utils/recheckStatus.js)
//   alert    mail sent to the lead's BDA and BDM when the recheck was raised:
//            { to: [email], subject, trigger: "auto", sentAt }
//
// GET /sales-audit/leads/summaries -> [{ id, studentFullName, course, saleOwner,
//   saleOwnerManager, confirmationCallLink, ccResponse }]
//   ccResponse null, or the BDA's answer for a pending CC:
//              { response: "mailSentAwaitingAck" | "mailNotSent", updatedAt, alert }
//   alert      set only for "mailNotSent": the reminder mailed to the BDA
import { HISTORICAL_RECHECKS } from './history'
import { MOCK_PAYMENTS, MOCK_STUDENTS } from './students'
import { getContactEmail } from '../../utils/contacts'
import { RECHECK_CATEGORIES } from '../../utils/recheckStatus'

const hoursAgo = (hours) => Math.floor(Date.now() / 1000) - hours * 60 * 60

// Leads are picked from the (anonymized) mock data by what fits each recheck, so the scenario
// holds whichever export the fixture was made from.
const used = new Set()
function pickLead(fits) {
  const lead = MOCK_STUDENTS.find((candidate) => !used.has(candidate.id) && fits(candidate))
  if (lead) used.add(lead.id)
  return lead
}

const isEmi = (lead) => /EMI/.test(lead.paymentType)
// Any payment on the lead was marked Mismatch (even if a later record was verified).
const hasMismatch = (lead) =>
  MOCK_PAYMENTS.some((payment) => payment.leadId === lead.id && payment.verified === 'Mismatch')

function recheck(id, lead, categories, notes, raisedHoursAgo, resolvedHoursAgo = null) {
  if (!lead) return null
  const raisedAt = hoursAgo(raisedHoursAgo)
  return {
    id,
    leadId: lead.id,
    categories,
    notes,
    status: resolvedHoursAgo == null ? 'open' : 'resolved',
    raisedBy: 'Audit Team',
    raisedAt,
    resolvedAt: resolvedHoursAgo == null ? null : hoursAgo(resolvedHoursAgo),
    alert: {
      to: [getContactEmail(lead.saleOwner), getContactEmail(lead.saleOwnerManager)],
      subject: `Recheck raised (${categories.map((key) => RECHECK_CATEGORIES[key].label).join(', ')}): ${lead.studentFullName}`,
      trigger: 'auto',
      sentAt: raisedAt,
    },
  }
}

export const MOCK_RECHECKS = [
  recheck(
    'rc-1',
    pickLead(hasMismatch),
    ['payment', 'approval'],
    'Amount on the payment record does not match what the learner paid.',
    5,
  ),
  recheck(
    'rc-2',
    pickLead((lead) => !lead.confirmationCallLink && lead.paymentType),
    ['ccPending'],
    'No confirmation call uploaded for this lead.',
    28,
  ),
  recheck(
    'rc-3',
    pickLead((lead) => isEmi(lead) && lead.confirmationCallLink),
    ['emi'],
    'Monthly EMI told to the learner does not match the loan record.',
    50,
  ),
  recheck(
    'rc-4',
    pickLead((lead) => lead.confirmationCallLink),
    ['missedPointsInCc'],
    'Medium of instruction and refund policy were not covered in the CC.',
    96,
    70,
  ),
  recheck(
    'rc-5',
    pickLead((lead) => lead.paymentType && !lead.credits.bookingAmount),
    ['downPayment', 'payment'],
    'Booking amount received but no payment proof attached.',
    2,
  ),
  // Older, resolved rechecks (mock-only history).
  ...HISTORICAL_RECHECKS,
].filter(Boolean)

// Keyed by lead id; leads without an entry have not responded yet. Two leads without a CC:
// one says the mail was sent, one that it wasn't (which mailed their BDA).
const awaitingAck = pickLead((lead) => !lead.confirmationCallLink && lead.paymentType)
const notSent = pickLead((lead) => !lead.confirmationCallLink && lead.paymentType)

export const MOCK_CC_RESPONSES = {
  ...(awaitingAck && {
    [awaitingAck.id]: { response: 'mailSentAwaitingAck', updatedAt: hoursAgo(10), alert: null },
  }),
  ...(notSent && {
    [notSent.id]: {
      response: 'mailNotSent',
      updatedAt: hoursAgo(20),
      alert: {
        to: [getContactEmail(notSent.saleOwner)],
        subject: `CC mail not sent: ${notSent.studentFullName}`,
        trigger: 'auto',
        sentAt: hoursAgo(20),
      },
    },
  }),
}
