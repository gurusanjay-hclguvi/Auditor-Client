// Lead list filters: the query keys GET /leads takes, and shortcuts for common questions.

// Shortcuts for the questions asked most often, as filter combinations.
export const LEAD_SHORTCUTS = [
  { label: 'Rechecks raised this month', filters: { recheckRaisedIn: 'thisMonth' } },
  {
    label: 'Raised & closed this month',
    filters: { recheckRaisedIn: 'thisMonth', recheckClosedIn: 'thisMonth' },
  },
  {
    label: 'Raised & closed last month',
    filters: { recheckRaisedIn: 'lastMonth', recheckClosedIn: 'lastMonth' },
  },
  { label: 'Completed last week', filters: { completedIn: 'lastWeek' } },
  { label: 'Open rechecks', filters: { auditStatus: 'recheckOpen' } },
  { label: 'Recheck closed · audit pending', filters: { awaitingReaudit: 'true' } },
  { label: 'CC pending', filters: { ccStatus: 'pending' } },
]

export const FILTER_KEYS = [
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

export const shortcutMatches = (filters, shortcut) =>
  FILTER_KEYS.every((key) => (filters[key] ?? '') === (shortcut.filters[key] ?? ''))
