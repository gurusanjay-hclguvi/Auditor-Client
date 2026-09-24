// Recheck categories an auditor can raise against a lead; `key` is what the API stores.
export const RECHECK_CATEGORIES = {
  ccPending: { label: 'CC Pending', color: 'warning' },
  payment: { label: 'Payment', color: 'error' },
  emi: { label: 'EMI', color: 'secondary' },
  approval: { label: 'Approval', color: 'info' },
  missedPointsInCc: { label: 'Missed points in CC', color: 'warning' },
  downPayment: { label: 'Down Payment', color: 'error' },
}

// Zoho's recheck `pendingList` uses its own labels ("Confirmation Call"); these map them to the
// categories above. A label with no match is kept as its own category (shown as it is).
const ZOHO_PENDING_LABELS = {
  'confirmation call': 'ccPending',
  'cc pending': 'ccPending',
  cc: 'ccPending',
  payment: 'payment',
  'payment details': 'payment',
  emi: 'emi',
  'emi details': 'emi',
  approval: 'approval',
  'discount approval': 'approval',
  discount: 'approval',
  'missed points in cc': 'missedPointsInCc',
  'down payment': 'downPayment',
  'booking amount': 'downPayment',
}

export function toCategoryKey(label) {
  const text = String(label ?? '').trim()
  if (RECHECK_CATEGORIES[text]) return text
  return ZOHO_PENDING_LABELS[text.toLowerCase()] ?? text
}

export const getCategoryLabel = (key) => RECHECK_CATEGORIES[key]?.label ?? key

// A recheck can cover several categories (`categories`); older records had one `category`.
export function getRecheckCategories(recheck) {
  if (Array.isArray(recheck.categories)) return recheck.categories
  return recheck.category ? [recheck.category] : []
}

export const formatRecheckCategories = (recheck) =>
  getRecheckCategories(recheck).map(getCategoryLabel).join(', ')

export const RECHECK_STATUS = {
  open: { label: 'Open', color: 'warning' },
  resolved: { label: 'Resolved', color: 'success' },
}

// The CC is the lead's Confirmation Call link: present means the BDA has uploaded it.
export function getCcStatus(lead) {
  return lead.confirmationCallLink ? 'completed' : 'pending'
}

// What the BDA reports for a pending CC.
export const CC_RESPONSES = {
  mailSentAwaitingAck: {
    label: 'Mail sent, acknowledgement not received',
    shortLabel: 'Awaiting acknowledgement',
  },
  mailNotSent: {
    label: 'Mail not sent yet',
    shortLabel: 'Mail not sent',
  },
}
