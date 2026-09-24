// Auditor decisions ("Mark verified → Awaiting"), keyed by lead. In memory, reset on reload.
const hoursAgo = (hours) => Math.floor(Date.now() / 1000) - hours * 60 * 60

export const MOCK_AUDITS = {
  'stu-1001': { auditedAt: hoursAgo(30), auditedBy: 'Audit Team', overrideReason: '' },
  'stu-1010': {
    auditedAt: hoursAgo(100),
    auditedBy: 'Audit Team',
    overrideReason: 'CC shared with the learner on WhatsApp; mail upload pending.',
  },
}
