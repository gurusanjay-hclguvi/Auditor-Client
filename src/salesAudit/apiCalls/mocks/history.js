import { MOCK_STUDENTS } from './students'
import { getContactEmail } from '../../utils/contacts'
import { RECHECK_CATEGORIES } from '../../utils/recheckStatus'

// Mock-only history (about 8 weeks) so the overview can show trends, repeat patterns and
// response times. Everything is relative to now. Deliberate patterns: Sales Owner Two keeps
// getting Payment rechecks, Diya Sample (stu-1002) has several rechecks, and Sales Owner Three
// resolves rechecks slowly.
const HOUR = 60 * 60
const hoursAgo = (hours) => Math.floor(Date.now() / 1000) - hours * HOUR

const NOTES = {
  payment: 'Amount or split told to the learner does not match the recorded payment plan.',
  emi: 'EMI terms quoted in the CC differ from the loan record.',
  ccPending: 'Confirmation call was not uploaded on time.',
  missedPointsInCc: 'Refund policy and batch timings were not covered in the CC.',
  approval: 'Discount was offered before approval was recorded.',
  downPayment: 'Down payment proof was missing at booking.',
}

// [id, leadId, category, raised hours ago, hours taken to resolve]
const RESOLVED_RECHECKS = [
  ['rc-h1', 'stu-1002', 'payment', 200, 30],
  ['rc-h2', 'stu-1005', 'payment', 400, 50],
  ['rc-h3', 'stu-1008', 'payment', 120, 20],
  ['rc-h4', 'stu-1002', 'approval', 600, 10],
  ['rc-h5', 'stu-1005', 'emi', 900, 60],
  ['rc-h6', 'stu-1001', 'downPayment', 250, 6],
  ['rc-h7', 'stu-1003', 'missedPointsInCc', 380, 4],
  ['rc-h8', 'stu-1010', 'approval', 700, 12],
  ['rc-h9', 'stu-1007', 'ccPending', 90, 8],
  ['rc-h10', 'stu-1001', 'missedPointsInCc', 1000, 5],
  ['rc-h11', 'stu-1004', 'emi', 150, 70],
  ['rc-h12', 'stu-1006', 'ccPending', 260, 40],
  ['rc-h13', 'stu-1009', 'ccPending', 500, 36],
  ['rc-h14', 'stu-1004', 'payment', 1100, 20],
  ['rc-h15', 'stu-1006', 'approval', 60, 30],
]

const leadById = (leadId) => MOCK_STUDENTS.find((student) => student.id === leadId)

export const HISTORICAL_RECHECKS = RESOLVED_RECHECKS.map(
  ([id, leadId, category, raisedHoursAgo, resolveHours]) => {
    const lead = leadById(leadId)
    const raisedAt = hoursAgo(raisedHoursAgo)
    return {
      id,
      leadId,
      category,
      notes: NOTES[category],
      status: 'resolved',
      raisedBy: 'Audit Team',
      raisedAt,
      resolvedAt: raisedAt + resolveHours * HOUR,
      alert: {
        to: [getContactEmail(lead.saleOwner), getContactEmail(lead.saleOwnerManager)],
        subject: `Recheck raised (${RECHECK_CATEGORIES[category].label}): ${lead.studentFullName}`,
        trigger: 'auto',
        sentAt: raisedAt,
      },
    }
  },
)

// Past "over 24h in SAP" mails: [leadId, sent hours ago].
const PAST_ESCALATIONS = [
  ['stu-1002', 190],
  ['stu-1005', 220],
  ['stu-1008', 400],
  ['stu-1007', 300],
  ['stu-1004', 180],
]

export const HISTORICAL_ALERTS = PAST_ESCALATIONS.map(([leadId, sentHoursAgo]) => {
  const lead = leadById(leadId)
  return {
    leadId,
    kind: 'escalation',
    to: [getContactEmail(lead.saleOwner), 'accounts@example.com'],
    subject: `Payment verification pending over 24h: ${lead.studentFullName}`,
    trigger: 'auto',
    sentAt: hoursAgo(sentHoursAgo),
  }
})
