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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (value) => String(value).padStart(2, '0')

// Unix seconds -> "23-Sep-2026 10:15".
export function formatDateTime(unixSeconds) {
  if (!unixSeconds) return EMPTY_VALUE
  const date = new Date(unixSeconds * 1000)
  return `${formatDay(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Unix seconds -> "23-Sep-2026".
export function formatDate(unixSeconds) {
  return unixSeconds ? formatDay(new Date(unixSeconds * 1000)) : EMPTY_VALUE
}

// A Zoho date string ("2026-07-01" or "2026-07-01 13:12:15.0") -> "01-Jul-2026".
export function formatZohoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  if (!match) return orEmpty(value)
  return `${match[3]}-${MONTHS[Number(match[2]) - 1]}-${match[1]}`
}

function formatDay(date) {
  return `${pad(date.getDate())}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`
}

// "Zen_Business_Analytics" -> "Zen Business Analytics".
export function formatProduct(product) {
  return orEmpty(product?.replace(/_/g, ' '))
}

// "10thPercentage" / "loptopWithStableInternet" -> "10th Percentage" / "Loptop With Stable Internet".
export function humanizeKey(key) {
  const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function orEmpty(value) {
  return value === '' || value == null ? EMPTY_VALUE : value
}
