import { MOCK_STUDENTS } from './students'
import { getPaymentShortfall } from '../../utils/leadStatus'

// Auditor decisions ("Mark audited": Awaiting → Audited), keyed by lead. In memory, reset on
// reload. Only leads with every payment verified and their plan's amount met reach Awaiting, so the two mock audits are on the
// first two such leads: one clean, one with an override reason.
const hoursAgo = (hours) => Math.floor(Date.now() / 1000) - hours * 60 * 60

const [clean, overridden] = MOCK_STUDENTS.filter(
  (lead) => lead.allPaymentsVerified && !getPaymentShortfall(lead),
)

export const MOCK_AUDITS = {
  ...(clean && {
    [clean.id]: { auditedAt: hoursAgo(30), auditedBy: 'Audit Team', overrideReason: '' },
  }),
  ...(overridden && {
    [overridden.id]: {
      auditedAt: hoursAgo(100),
      auditedBy: 'Audit Team',
      overrideReason: 'CC shared with the learner on WhatsApp; mail upload pending.',
    },
  }),
}
