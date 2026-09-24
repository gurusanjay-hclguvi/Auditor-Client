// Fake rechecks and CC responses. Planned backend shapes:
//
// GET /sales-audit/rechecks -> [recheck]
//   recheck  { id, leadId, category, notes, status: "open" | "resolved", raisedBy,
//              raisedAt, resolvedAt, alert }   (timestamps are Unix seconds)
//   category one of the keys of RECHECK_CATEGORIES (utils/recheckStatus.js)
//   alert    mail sent to the lead's BDA and BDM when the recheck was raised:
//            { to: [email], subject, trigger: "auto", sentAt }
//
// GET /sales-audit/leads/summaries -> [{ id, studentFullName, course, saleOwner,
//   saleOwnerManager, confirmationCallLink, ccResponse }]
//   ccResponse null, or the BDA's answer for a pending CC:
//              { response: "mailSentAwaitingAck" | "mailNotSent", updatedAt, alert }
//   alert      set only for "mailNotSent": the reminder mailed to the BDA
import { HISTORICAL_RECHECKS } from './history'

const hoursAgo = (hours) => Math.floor(Date.now() / 1000) - hours * 60 * 60

const alert = (to, subject, hours) => ({ to, subject, trigger: 'auto', sentAt: hoursAgo(hours) })

export const MOCK_RECHECKS = [
  {
    id: 'rc-1',
    leadId: 'stu-1002',
    category: 'payment',
    notes: 'Second partial on the CC differs from the recorded split (₹22,500 vs ₹22,000).',
    status: 'open',
    raisedBy: 'Audit Team',
    raisedAt: hoursAgo(5),
    resolvedAt: null,
    alert: alert(
      ['owner2@example.com', 'managera@example.com'],
      'Recheck raised (Payment): Diya Sample',
      5,
    ),
  },
  {
    id: 'rc-2',
    leadId: 'stu-1004',
    category: 'ccPending',
    notes: 'No confirmation call uploaded for this lead.',
    status: 'open',
    raisedBy: 'Audit Team',
    raisedAt: hoursAgo(28),
    resolvedAt: null,
    alert: alert(
      ['owner3@example.com', 'managerb@example.com'],
      'Recheck raised (CC Pending): Meera Placeholder',
      28,
    ),
  },
  {
    id: 'rc-3',
    leadId: 'stu-1005',
    category: 'emi',
    notes: 'Monthly EMI told to the learner (₹6,800) does not match the loan record (₹6,500).',
    status: 'open',
    raisedBy: 'Audit Team',
    raisedAt: hoursAgo(50),
    resolvedAt: null,
    alert: alert(
      ['owner2@example.com', 'managera@example.com'],
      'Recheck raised (EMI): Rohan Mock',
      50,
    ),
  },
  {
    id: 'rc-4',
    leadId: 'stu-1006',
    category: 'missedPointsInCc',
    notes: 'Medium of instruction and refund policy were not covered in the CC.',
    status: 'resolved',
    raisedBy: 'Audit Team',
    raisedAt: hoursAgo(96),
    resolvedAt: hoursAgo(70),
    alert: alert(
      ['owner3@example.com', 'managerb@example.com'],
      'Recheck raised (Missed points in CC): Sana Example',
      96,
    ),
  },
  {
    id: 'rc-5',
    leadId: 'stu-1008',
    category: 'downPayment',
    notes: 'Booking amount received but no payment proof attached.',
    status: 'open',
    raisedBy: 'Audit Team',
    raisedAt: hoursAgo(2),
    resolvedAt: null,
    alert: alert(
      ['owner2@example.com', 'managerb@example.com'],
      'Recheck raised (Down Payment): Nila Stub',
      2,
    ),
  },  // Older, resolved rechecks (mock-only history).
  ...HISTORICAL_RECHECKS,
]

// Keyed by lead id; leads without an entry have not responded yet.
export const MOCK_CC_RESPONSES = {
  'stu-1007': { response: 'mailSentAwaitingAck', updatedAt: hoursAgo(10), alert: null },
  'stu-1009': {
    response: 'mailNotSent',
    updatedAt: hoursAgo(20),
    alert: alert(['owner3@example.com'], 'CC mail not sent: Varun Dummy', 20),
  },
}
