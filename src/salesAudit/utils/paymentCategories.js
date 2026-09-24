// Drill-down categories, keyed by the `category` query param, matched against a transaction's `type`.
export const PAYMENT_CATEGORIES = {
  all: { label: 'All Transactions', matches: () => true },
  downPayment: { label: 'Down Payment', matches: (type) => type === 'Credit_Booking_Amount' },
  emi: { label: 'EMI', matches: (type) => type === 'Credit_EMI' },
  partial: { label: 'Partial Payments', matches: (type) => /^Credit_Part\d+$/.test(type) },
  remainingBalance: {
    label: 'Remaining Balance',
    matches: (type) => type === 'Credit_RemainingBalance',
  },
  subscription: { label: 'Subscription', matches: (type) => /^Subscription \d+$/.test(type) },
  discount: { label: 'Discount', matches: (type) => type === 'Discount' },
}

const TYPE_LABELS = {
  Credit_Booking_Amount: 'Down payment',
  Credit_Part1: 'Initial payment',
  Credit_RemainingBalance: 'Remaining balance',
  Credit_EMI: 'EMI disbursal',
  Discount: 'Discount (credit note)',
}

// A financialDetails `type` in words: "Credit_Part2" -> "Partial 2"; unknown types as they are.
export function getPaymentTypeLabel(type) {
  if (TYPE_LABELS[type]) return TYPE_LABELS[type]
  const part = type?.match(/^Credit_Part(\d+)$/)?.[1]
  return part ? `Partial ${part}` : type || ''
}

export function resolveCategory(category) {
  return category in PAYMENT_CATEGORIES ? category : 'all'
}

export function filterPaymentsByCategory(payments, category) {
  const { matches } = PAYMENT_CATEGORIES[resolveCategory(category)]
  return payments.filter((payment) => matches(payment.type))
}
