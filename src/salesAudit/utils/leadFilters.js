// Lead filters for the Leads pages: each filter is { id, field, operator, value, valueTo } and a
// lead must match every filter. Field values come from the normalized lead (utils/zohoLead.js).

const text = (value) => (value == null ? '' : String(value).trim())

// type: 'text' (strings, emails, numbers compared as text) or 'date' (Unix seconds).
export const FILTER_FIELDS = [
  { key: 'zenId', label: 'ZEN ID', type: 'text', get: (lead) => lead.zenId },
  { key: 'studentFullName', label: 'Student Full Name', type: 'text', get: (lead) => lead.studentFullName },
  { key: 'dateOfEnrolment', label: 'Date of Enrolment', type: 'date', get: (lead) => lead.enrolledAt },
  { key: 'admissionForm', label: 'Filled Admission Form?', type: 'text', get: (lead) => lead.admissionForm },
  { key: 'saleOwner', label: 'Sale Owner', type: 'text', get: (lead) => lead.saleOwner },
  { key: 'email', label: 'Email', type: 'text', get: (lead) => lead.email },
  { key: 'primaryPhone', label: 'Primary Phone', type: 'text', get: (lead) => lead.primaryPhone },
  { key: 'product', label: 'Product', type: 'text', get: (lead) => lead.product || lead.course },
  { key: 'courseValue', label: 'Course Value', type: 'text', get: (lead) => lead.courseValue },
  { key: 'totalPaid', label: 'Total Paid', type: 'text', get: (lead) => lead.totalPaid },
  { key: 'balanceAmount', label: 'Balance Amount', type: 'text', get: (lead) => lead.balanceAmount },
  { key: 'batchName', label: 'Assigned Batch', type: 'text', get: (lead) => lead.batchName },
  { key: 'batchStartDate', label: 'Batch Start Date', type: 'date', get: (lead) => lead.batchStartAt },
  { key: 'modeOfStudy', label: 'Mode of Study', type: 'text', get: (lead) => lead.modeOfStudy },
  { key: 'preferredLanguage', label: 'Preferred Language of Study', type: 'text', get: (lead) => lead.preferredLanguage },
  { key: 'sourceMedium', label: 'Source Medium DM', type: 'text', get: (lead) => lead.sourceMedium },
  { key: 'sourceCampaign', label: 'Source Campaign DM', type: 'text', get: (lead) => lead.sourceCampaign },
  { key: 'leadSource', label: 'Lead Source', type: 'text', get: (lead) => lead.leadSource },
  { key: 'superleapId', label: 'Superleap Lead Id', type: 'text', get: (lead) => lead.superleapId || lead.id },
  { key: 'paymentType', label: 'Payment Type', type: 'text', get: (lead) => lead.paymentType },
  { key: 'paymentMode', label: 'Payment Mode', type: 'text', get: (lead) => lead.paymentMode },
  { key: 'salesTeam', label: 'Sales Team', type: 'text', get: (lead) => lead.salesTeam },
  { key: 'salesFrom', label: 'Sales From', type: 'text', get: (lead) => lead.salesFrom },
  { key: 'confirmationCallLink', label: 'Confirmation Call Link', type: 'text', get: (lead) => lead.confirmationCallLink },
  { key: 'termsAndConditions', label: 'Terms and Conditions', type: 'text', get: (lead) => lead.termsAndConditions },
  { key: 'promoCode', label: 'Promo Code', type: 'text', get: (lead) => lead.promoCode },
  {
    key: 'paysInSameMonth',
    label: 'Will the entire amount be paid off in the same month?',
    type: 'text',
    get: (lead) => lead.paysInSameMonth,
  },
]

export const getFilterField = (key) => FILTER_FIELDS.find((field) => field.key === key)

// inputs: how many values the operator needs (0, 1 or 2).
export const TEXT_OPERATORS = [
  { key: 'is', label: 'Is', inputs: 1 },
  { key: 'isNotEmpty', label: 'Is Not Empty', inputs: 0 },
  { key: 'startsWith', label: 'Starts With', inputs: 1 },
  { key: 'endsWith', label: 'Ends With', inputs: 1 },
  { key: 'contains', label: 'Contains', inputs: 1 },
  { key: 'notContains', label: 'Not Contains', inputs: 1 },
]

// `group` puts the relative ones under Day / Week / Month / Year headings in the dropdown.
export const DATE_OPERATORS = [
  { key: 'is', label: 'Is', inputs: 1 },
  { key: 'isNot', label: 'Is not', inputs: 1 },
  { key: 'empty', label: 'Empty', inputs: 0 },
  { key: 'isNotEmpty', label: 'Is not Empty', inputs: 0 },
  { key: 'before', label: 'Before', inputs: 1 },
  { key: 'after', label: 'After', inputs: 1 },
  { key: 'between', label: 'Between', inputs: 2 },
  { key: 'yesterday', label: 'Yesterday', inputs: 0, group: 'Day' },
  { key: 'today', label: 'Today', inputs: 0, group: 'Day' },
  { key: 'tomorrow', label: 'Tomorrow', inputs: 0, group: 'Day' },
  { key: 'lastWeek', label: 'Last Week', inputs: 0, group: 'Week' },
  { key: 'thisWeek', label: 'This Week', inputs: 0, group: 'Week' },
  { key: 'nextWeek', label: 'Next Week', inputs: 0, group: 'Week' },
  { key: 'lastMonth', label: 'Last Month', inputs: 0, group: 'Month' },
  { key: 'thisMonth', label: 'This Month', inputs: 0, group: 'Month' },
  { key: 'nextMonth', label: 'Next Month', inputs: 0, group: 'Month' },
  { key: 'lastYear', label: 'Last Year', inputs: 0, group: 'Year' },
  { key: 'thisYear', label: 'This Year', inputs: 0, group: 'Year' },
  { key: 'nextYear', label: 'Next Year', inputs: 0, group: 'Year' },
]

export const getOperators = (type) => (type === 'date' ? DATE_OPERATORS : TEXT_OPERATORS)
export const getOperator = (type, key) => getOperators(type).find((operator) => operator.key === key)

// A filter row counts once its field, operator and needed values are all set.
export function isComplete(filter) {
  const field = getFilterField(filter.field)
  const operator = field && getOperator(field.type, filter.operator)
  if (!operator) return false
  if (operator.inputs >= 1 && !text(filter.value)) return false
  if (operator.inputs === 2 && !text(filter.valueTo)) return false
  return true
}

function matchesText(value, operator, wanted) {
  const actual = text(value).toLowerCase()
  const target = text(wanted).toLowerCase()
  switch (operator) {
    case 'is':
      return actual === target
    case 'isNotEmpty':
      return actual !== ''
    case 'startsWith':
      return actual.startsWith(target)
    case 'endsWith':
      return actual.endsWith(target)
    case 'contains':
      return actual.includes(target)
    case 'notContains':
      return !actual.includes(target)
    default:
      return true
  }
}

// Calendar ranges in the viewer's local time: [start, end) in milliseconds.
const DAY_MS = 24 * 60 * 60 * 1000
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
const parseInputDay = (value) => {
  const [year, month, day] = text(value).split('-').map(Number)
  return year ? new Date(year, month - 1, day) : null
}

function dayRange(date) {
  const start = startOfDay(date)
  return [start.getTime(), addDays(start, 1).getTime()]
}

function weekRange(now, offset) {
  const today = startOfDay(now)
  const monday = addDays(today, -((today.getDay() + 6) % 7) + offset * 7)
  return [monday.getTime(), addDays(monday, 7).getTime()]
}

function monthRange(now, offset) {
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return [start.getTime(), new Date(start.getFullYear(), start.getMonth() + 1, 1).getTime()]
}

function yearRange(now, offset) {
  const year = now.getFullYear() + offset
  return [new Date(year, 0, 1).getTime(), new Date(year + 1, 0, 1).getTime()]
}

const RELATIVE_RANGES = {
  yesterday: (now) => dayRange(addDays(now, -1)),
  today: (now) => dayRange(now),
  tomorrow: (now) => dayRange(addDays(now, 1)),
  lastWeek: (now) => weekRange(now, -1),
  thisWeek: (now) => weekRange(now, 0),
  nextWeek: (now) => weekRange(now, 1),
  lastMonth: (now) => monthRange(now, -1),
  thisMonth: (now) => monthRange(now, 0),
  nextMonth: (now) => monthRange(now, 1),
  lastYear: (now) => yearRange(now, -1),
  thisYear: (now) => yearRange(now, 0),
  nextYear: (now) => yearRange(now, 1),
}

function matchesDate(seconds, operator, value, valueTo, nowMs) {
  const hasDate = seconds != null && seconds !== ''
  if (operator === 'empty') return !hasDate
  if (operator === 'isNotEmpty') return hasDate
  if (!hasDate) return false
  const ms = Number(seconds) * 1000
  const inRange = ([start, end]) => ms >= start && ms < end

  if (RELATIVE_RANGES[operator]) return inRange(RELATIVE_RANGES[operator](new Date(nowMs)))

  const day = parseInputDay(value)
  if (!day) return true
  const [start, end] = dayRange(day)
  switch (operator) {
    case 'is':
      return inRange([start, end])
    case 'isNot':
      return !inRange([start, end])
    case 'before':
      return ms < start
    case 'after':
      return ms >= end
    case 'between': {
      const last = parseInputDay(valueTo)
      if (!last) return true
      const [from, to] = start <= last.getTime() ? [start, last.getTime()] : [last.getTime(), start]
      return ms >= from && ms < to + DAY_MS
    }
    default:
      return true
  }
}

export function matchesFilter(lead, filter, nowMs) {
  const field = getFilterField(filter.field)
  if (!field || !isComplete(filter)) return true
  const value = field.get(lead)
  return field.type === 'date'
    ? matchesDate(value, filter.operator, filter.value, filter.valueTo, nowMs)
    : matchesText(value, filter.operator, filter.value)
}

export const matchesFilters = (lead, filters, nowMs) =>
  filters.every((filter) => matchesFilter(lead, filter, nowMs))

// "Payment Type contains EMI", "Date of Enrolment between 2026-09-01 and 2026-09-10"
export function describeFilter(filter) {
  const field = getFilterField(filter.field)
  const operator = field && getOperator(field.type, filter.operator)
  if (!operator) return ''
  const values =
    operator.inputs === 2
      ? ` ${filter.value} and ${filter.valueTo}`
      : operator.inputs === 1
        ? ` "${filter.value}"`
        : ''
  return `${field.label} ${operator.label.toLowerCase()}${values}`
}
