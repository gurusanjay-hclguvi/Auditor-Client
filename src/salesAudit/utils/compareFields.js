export const PERSONAL_FIELDS = [
  { key: 'personal.learnerName', label: 'Learner Name' },
  { key: 'personal.email', label: 'Email' },
  { key: 'personal.contactNumber', label: 'Contact Number' },
]

export const COURSE_FIELDS = [
  { key: 'courseDetails.courseName', label: 'Course Name' },
  { key: 'courseDetails.duration', label: 'Duration' },
  { key: 'courseDetails.startDate', label: 'Start Date' },
  { key: 'courseDetails.time', label: 'Time' },
  { key: 'courseDetails.mode', label: 'Mode' },
  { key: 'courseDetails.medium', label: 'Medium' },
]

const BASE_PAYMENT_FIELDS = [
  { key: 'payment.totalFee', label: 'Total Course Fee' },
  { key: 'payment.downPayment', label: 'Down Payment (Non-Refundable)' },
]

export const EMI_FIELDS = [
  { key: 'payment.emi.loanAmount', label: 'Loan Amount' },
  { key: 'payment.emi.monthlyEmi', label: 'Monthly EMI' },
  { key: 'payment.emi.roi', label: 'ROI' },
  { key: 'payment.emi.dueDate', label: 'EMI Due Date' },
]

const INSTALLMENT_ORDINALS = ['First', 'Second', 'Third', 'Fourth']
const DEFAULT_INSTALLMENT_COUNT = { partial: 3, subscription: 4, emiPartial: 2 }

// "40-30-30" -> 3 installments; falls back to the payment mode's usual count.
export function getInstallmentCount(paymentMode, partialSplitUpCategory) {
  const splitCount = (partialSplitUpCategory ?? '').split('-').filter(Boolean).length
  return splitCount || DEFAULT_INSTALLMENT_COUNT[paymentMode] || 0
}

function getInstallmentFields(count) {
  return Array.from({ length: count }, (_, index) => {
    const ordinal = INSTALLMENT_ORDINALS[index] ?? `#${index + 1}`
    return [
      { key: `payment.installments.${index}.percentage`, label: `${ordinal} Partial - Percentage` },
      { key: `payment.installments.${index}.dueDate`, label: `${ordinal} Partial - Due Date` },
      { key: `payment.installments.${index}.amount`, label: `${ordinal} Partial - Amount` },
    ]
  }).flat()
}

// EMI carries a loan breakdown, Partial/Subscription carry dated installments, and
// EMI + Partial carries both (part of the fee financed, the rest paid in partials).
export function getPaymentFields(paymentMode, installmentCount) {
  switch (paymentMode) {
    case 'emi':
      return [...BASE_PAYMENT_FIELDS, ...EMI_FIELDS]
    case 'partial':
    case 'subscription':
      return [...BASE_PAYMENT_FIELDS, ...getInstallmentFields(installmentCount)]
    case 'emiPartial':
      return [...BASE_PAYMENT_FIELDS, ...EMI_FIELDS, ...getInstallmentFields(installmentCount)]
    default:
      return BASE_PAYMENT_FIELDS
  }
}
