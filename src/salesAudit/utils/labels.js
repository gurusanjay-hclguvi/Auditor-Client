// Display labels and chip colours for the backend's enums.

export const AUDIT_STATUS = {
  unassigned: { label: 'Unassigned', color: 'default' },
  pending: { label: 'Audit pending', color: 'info' },
  recheckOpen: { label: 'Recheck open', color: 'warning' },
  recheckClosed: { label: 'Recheck closed · audit again', color: 'secondary' },
  completed: { label: 'Audit completed', color: 'success' },
}

export const RECHECK_CATEGORIES = {
  ccPending: 'CC Pending',
  payment: 'Payment',
  emi: 'EMI',
  approval: 'Approval',
  missedPointsInCc: 'Missed points in CC',
  downPayment: 'Down Payment',
}

export const CC_STATUS = {
  updated: { label: 'CC updated', color: 'success' },
  pending: { label: 'CC pending', color: 'warning' },
}

export const CC_TYPE_LABELS = {
  pdf: 'Confirmation PDF',
  recording: 'Call recording',
  link: 'CC link',
}

export const ASSIGN_MODE_LABELS = {
  auto: 'auto-assigned',
  manual: 'reassigned',
  takeUp: 'taken up',
  zoho: 'from Zoho',
}

export const EVENT_LABELS = {
  leadImported: 'Lead came in',
  assigned: 'Assigned for audit',
  reassigned: 'Reassigned',
  takenUp: 'Taken up',
  ccUpdated: 'CC updated',
  auditCompleted: 'Audit completed',
  recheckRaised: 'Recheck raised',
  recheckClosed: 'Recheck closed',
}

export const REGIONS = ['North', 'South']

// Date presets the backend understands for …In filters.
export const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'thisWeek', label: 'This week' },
  { value: 'lastWeek', label: 'Last week' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
]

export const categoryLabel = (key) => RECHECK_CATEGORIES[key] ?? key
export const auditStatusOf = (status) => AUDIT_STATUS[status] ?? { label: status, color: 'default' }

// A recheck's reasons ([{category, comments}]). Rechecks from Zoho or from before there could be
// several reasons only carry category + comments: that is their one reason.
export const reasonsOf = (recheck) =>
  recheck.reasons?.length
    ? recheck.reasons
    : [{ category: recheck.category, comments: recheck.comments }]

// A CC recheck whose CC was updated after it was raised, but which is still open: the fix is in,
// and only closing the ticket lets the auditor audit the lead again.
export const ccUpdatedNotClosed = (recheck) => recheck.status === 'open' && recheck.ccUpdatedAt > 0
