// Lead list filters: the query keys GET /leads takes, and shortcuts for common questions.

// The lead lists are split in two tabs: leads whose audit is still going, and completed ones.
export const PENDING_STATUSES = ['unassigned', 'pending', 'recheckOpen', 'recheckClosed']
export const LEAD_TABS = [
  { value: 'pending', label: 'Pending leads' },
  { value: 'completed', label: 'Completed leads' },
]
export const tabOf = (params) => (params.get('tab') === 'completed' ? 'completed' : 'pending')

// Shortcuts for the questions asked most often, as filter combinations; `tabs` says where each
// one makes sense.
const BOTH = ['pending', 'completed']
export const LEAD_SHORTCUTS = [
  { label: 'Rechecks raised this month', filters: { recheckRaisedIn: 'thisMonth' }, tabs: BOTH },
  {
    label: 'Raised & closed this month',
    filters: { recheckRaisedIn: 'thisMonth', recheckClosedIn: 'thisMonth' },
    tabs: BOTH,
  },
  {
    label: 'Raised & closed last month',
    filters: { recheckRaisedIn: 'lastMonth', recheckClosedIn: 'lastMonth' },
    tabs: BOTH,
  },
  { label: 'Completed this week', filters: { completedIn: 'thisWeek' }, tabs: ['completed'] },
  { label: 'Completed last week', filters: { completedIn: 'lastWeek' }, tabs: ['completed'] },
  { label: 'Completed this month', filters: { completedIn: 'thisMonth' }, tabs: ['completed'] },
  { label: 'Open rechecks', filters: { auditStatus: 'recheckOpen' }, tabs: ['pending'] },
  {
    label: 'Recheck closed · audit pending',
    filters: { awaitingReaudit: 'true' },
    tabs: ['pending'],
  },
  { label: 'CC pending', filters: { ccStatus: 'pending' }, tabs: ['pending'] },
]

const FILTER_KEYS = [
  'search',
  'auditStatus',
  'region',
  'auditorEmail',
  'bdaEmail',
  'ccStatus',
  'recheckCategory',
  'completedIn',
  'recheckRaisedIn',
  'recheckClosedIn',
  'awaitingReaudit',
]

// Filters that only make sense on one tab: an audit status before completed and awaiting a
// re-audit on Pending, when the audit was completed on Completed.
const TAB_ONLY_KEYS = { pending: ['auditStatus', 'awaitingReaudit'], completed: ['completedIn'] }

// The filter keys a tab takes.
export const filterKeysOf = (tab) =>
  FILTER_KEYS.filter((key) =>
    Object.entries(TAB_ONLY_KEYS).every(([other, keys]) => other === tab || !keys.includes(key)),
  )

// The audit statuses a tab lists: completed, or the picked pending ones (all of them by default).
export function auditStatusFor(tab, picked) {
  if (tab === 'completed') return 'completed'
  const statuses = (picked ?? '').split(',').filter((status) => PENDING_STATUSES.includes(status))
  return (statuses.length ? statuses : PENDING_STATUSES).join(',')
}
