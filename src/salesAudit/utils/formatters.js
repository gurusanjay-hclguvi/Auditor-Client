import { getContactName } from './contacts'

export const EMPTY_VALUE = '—'

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatCurrency(value) {
  if (value === '' || value == null || Number.isNaN(Number(value))) return EMPTY_VALUE
  return inrFormatter.format(Number(value))
}

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

// 108000000 -> "1d 6h"; 19200000 -> "5h 20m"; 720000 -> "12m".
export function formatDuration(ms) {
  const days = Math.floor(ms / DAY_MS)
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS)
  if (days) return `${days}d ${hours}h`
  if (hours) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (value) => String(value).padStart(2, '0')

// Unix seconds -> "23-Sep-2026 10:15", matching the source data's date format.
export function formatDateTime(unixSeconds) {
  if (!unixSeconds) return EMPTY_VALUE
  const date = new Date(unixSeconds * 1000)
  const day = `${pad(date.getDate())}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`
  return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// "Sales Owner One - owner1@example.com" -> "Sales Owner One".
export function contactName(contact) {
  return orEmpty(getContactName(contact))
}

// 0.6425 -> "64%"; null (nothing to measure) -> "—".
export function formatPercent(value) {
  return value == null ? EMPTY_VALUE : `${Math.round(value * 100)}%`
}

export function orEmpty(value) {
  return value === '' || value == null ? EMPTY_VALUE : value
}
