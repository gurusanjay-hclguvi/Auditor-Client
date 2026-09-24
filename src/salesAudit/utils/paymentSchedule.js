import { parseZohoDate } from './zohoLead'

// Installment status from a schedule item (see toSchedule). Zoho marks a reminder Paid, Inactive
// (closed) or Active; an active one is Overdue once its due date has passed, else Upcoming.
export const INSTALLMENT_STATUS = {
  paid: { label: 'Paid', color: 'success' },
  closed: { label: 'Closed', color: 'default' },
  overdue: { label: 'Overdue', color: 'error' },
  upcoming: { label: 'Upcoming', color: 'primary' },
}

const DAY_S = 24 * 60 * 60

const isDone = (status) => status === 'paid' || status === 'closed'

export function getInstallmentStatus(item, nowMs) {
  const zohoStatus = item.status.toLowerCase()
  if (zohoStatus === 'paid') return 'paid'
  if (zohoStatus === 'inactive') return 'closed'
  const due = parseZohoDate(item.dueDate)
  // Due today is not overdue yet.
  return due != null && due + DAY_S <= nowMs / 1000 ? 'overdue' : 'upcoming'
}

// What's next on the plan: { state: 'unknown' } when Zoho has no balance for the lead (no
// payment plan yet), { state: 'paid' } when nothing is owed, { state: 'due', item, status } for
// the earliest open installment, or { state: 'none' } when a balance is owed but no installment
// is scheduled.
export function getNextPayment(schedule, balanceAmount, nowMs) {
  if (balanceAmount === '' || balanceAmount == null) return { state: 'unknown' }
  if (!(Number(balanceAmount) > 0)) return { state: 'paid' }
  const item = schedule.items.find((candidate) => !isDone(getInstallmentStatus(candidate, nowMs)))
  return item ? { state: 'due', item, status: getInstallmentStatus(item, nowMs) } : { state: 'none' }
}
