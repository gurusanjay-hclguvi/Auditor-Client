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
}

export function resolveCategory(category) {
  return category in PAYMENT_CATEGORIES ? category : 'all'
}

export function filterPaymentsByCategory(payments, category) {
  const { matches } = PAYMENT_CATEGORIES[resolveCategory(category)]
  return payments.filter((payment) => matches(payment.type))
}
