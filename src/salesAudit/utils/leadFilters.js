// The lead lists: their tabs, the filter sidebar's fields and operators, and links into them.
import { paths } from './routePaths'
import { AUDIT_STATUS, CC_STATUS, RECHECK_CATEGORIES, REGIONS } from './labels'

// The lead lists are split in three tabs: leads waiting for an audit (including the ones to audit
// again after their recheck was closed), leads with a recheck open, and completed ones.
export const PENDING_STATUSES = ['unassigned', 'pending', 'recheckClosed']
export const LEAD_TABS = [
  { value: 'pending', label: 'Pending Audits' },
  { value: 'rechecks', label: 'Rechecks Initiated' },
  { value: 'completed', label: 'Audit Completed' },
]
const TAB_VALUES = LEAD_TABS.map((tab) => tab.value)
export const tabOf = (params) =>
  TAB_VALUES.includes(params.get('tab')) ? params.get('tab') : 'pending'

// The audit statuses a tab lists.
export function auditStatusFor(tab) {
  if (tab === 'completed') return 'completed'
  if (tab === 'rechecks') return 'recheckOpen'
  return PENDING_STATUSES.join(',')
}

// Operators per kind of value. `values` is how many values the operator takes.
const op = (value, label, values = 1) => ({ value, label, values })
const TEXT_OPS = [
  op('is', 'Is'),
  op('isNot', 'Is Not'),
  op('isEmpty', 'Is Empty', 0),
  op('isNotEmpty', 'Is Not Empty', 0),
  op('startsWith', 'Starts With'),
  op('endsWith', 'Ends With'),
  op('contains', 'Contains'),
  op('notContains', 'Not Contains'),
]
const ENUM_OPS = TEXT_OPS.slice(0, 4)
const NUMBER_OPS = [
  ...ENUM_OPS,
  op('lessThan', 'Less Than'),
  op('greaterThan', 'Greater Than'),
  op('between', 'Between', 2),
]
// Date operators; `group` starts a heading in the operator list.
const DATE_OPS = [
  op('is', 'Is'),
  op('isNot', 'Is not'),
  op('isEmpty', 'Empty', 0),
  op('isNotEmpty', 'Is not Empty', 0),
  op('before', 'Before'),
  op('after', 'After'),
  op('between', 'Between', 2),
  { ...op('yesterday', 'Yesterday', 0), group: 'Day' },
  op('today', 'Today', 0),
  op('tomorrow', 'Tomorrow', 0),
  { ...op('lastWeek', 'Last Week', 0), group: 'Week' },
  op('thisWeek', 'This Week', 0),
  op('nextWeek', 'Next Week', 0),
  { ...op('lastMonth', 'Last Month', 0), group: 'Month' },
  op('thisMonth', 'This Month', 0),
  op('nextMonth', 'Next Month', 0),
  { ...op('lastYear', 'Last Year', 0), group: 'Year' },
  op('thisYear', 'This Year', 0),
  op('nextYear', 'Next Year', 0),
]
export const OPERATORS = { text: TEXT_OPS, enum: ENUM_OPS, number: NUMBER_OPS, date: DATE_OPS }
export const operatorOf = (kind, value) =>
  OPERATORS[kind].find((item) => item.value === value) ?? OPERATORS[kind][0]

const entries = (labels) => Object.entries(labels).map(([key, item]) => [key, item.label ?? item])

// Every filterable column of the lead lists, in column order; `key` is what GET /leads takes in
// `filters`. Enum fields list their options; `suggest` names the options a text field suggests.
export const LEAD_FILTER_FIELDS = [
  { key: 'name', label: 'Learner', kind: 'text' },
  { key: 'zenId', label: 'Zen ID', kind: 'text' },
  { key: 'product', label: 'Course', kind: 'text' },
  { key: 'region', label: 'Region', kind: 'enum', options: REGIONS.map((r) => [r, r]) },
  { key: 'auditorEmail', label: 'Audit Coordinator', kind: 'text', suggest: 'auditors' },
  { key: 'bdaEmail', label: 'BDA', kind: 'text', suggest: 'bdas' },
  { key: 'paymentType', label: 'Payment', kind: 'text' },
  { key: 'ccStatus', label: 'CC', kind: 'enum', options: entries(CC_STATUS) },
  { key: 'auditStatus', label: 'Audit', kind: 'enum', options: entries(AUDIT_STATUS) },
  { key: 'enrolledAt', label: 'Enrolled', kind: 'date' },
  { key: 'recheckNo', label: 'SR ID', kind: 'text' },
  { key: 'recheckComments', label: 'Audit Team Comments', kind: 'text' },
  {
    key: 'recheckCategory',
    label: 'Recheck Category',
    kind: 'enum',
    options: entries(RECHECK_CATEGORIES),
  },
  {
    key: 'recheckReason',
    label: 'Recheck Reason',
    kind: 'enum',
    options: entries(RECHECK_CATEGORIES),
  },
  { key: 'recheckRaisedAt', label: 'Recheck Date Time', kind: 'date' },
  { key: 'recheckRaisedBy', label: 'Recheck Request From', kind: 'text' },
  {
    key: 'recheckStatus',
    label: 'Ticket Status',
    kind: 'enum',
    options: [
      ['open', 'Open'],
      ['closed', 'Closed'],
    ],
  },
  { key: 'recheckAttempt', label: 'CC Recheck Attempt', kind: 'number' },
  { key: 'recheckClosedAt', label: 'Resubmit Date Time', kind: 'date' },
  { key: 'ccLink', label: 'New Confirmation Call Link', kind: 'text' },
  { key: 'batch', label: 'Assigned Batch', kind: 'text' },
  { key: 'salesFrom', label: 'Sales From', kind: 'text' },
  { key: 'awaitingAt', label: 'Awaiting Main Bootcamp Date-Time', kind: 'date' },
  { key: 'onboardCoordinator', label: 'Onboarding Coordinator', kind: 'text' },
  { key: 'onboardingAt', label: 'Onboarded Date Time', kind: 'date' },
  { key: 'assignedAt', label: 'Audit Coordinator Assigned Date-Time', kind: 'date' },
  { key: 'completedAt', label: 'Audit Completed Date-Time', kind: 'date' },
]

// The fields a tab can filter on: the audit status only on Pending Audits (among its statuses),
// since the other tabs have one status each.
export function filterFieldsFor(tab) {
  return LEAD_FILTER_FIELDS.flatMap((field) => {
    if (field.key !== 'auditStatus') return [field]
    if (tab !== 'pending') return []
    return [{ ...field, options: field.options.filter(([key]) => PENDING_STATUSES.includes(key)) }]
  })
}

// A rule is complete when it has as many values as its operator takes.
export function isComplete(rule) {
  const field = LEAD_FILTER_FIELDS.find((item) => item.key === rule.field)
  if (!field) return false
  const { values } = operatorOf(field.kind, rule.op)
  return (values < 1 || Boolean(rule.value)) && (values < 2 || Boolean(rule.value2))
}

// The rules in the URL (`filters`, a JSON list of {field, op, value, value2}).
export function rulesOf(params) {
  try {
    const rules = JSON.parse(params.get('filters') || '[]')
    return Array.isArray(rules) ? rules.filter(isComplete) : []
  } catch {
    return []
  }
}

// A link to the lead list on a tab with these rules (and search).
export function leadsLink({ tab = 'pending', rules = [], search = '' } = {}) {
  const query = new URLSearchParams()
  if (tab !== 'pending') query.set('tab', tab)
  if (search) query.set('search', search)
  if (rules.length) query.set('filters', JSON.stringify(rules))
  const text = query.toString()
  return text ? `${paths.leads}?${text}` : paths.leads
}
