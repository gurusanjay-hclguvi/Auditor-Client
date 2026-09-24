const PARTIAL_PAYMENT_TYPES = new Set(['Direct - Partial Payment', 'EMI + Partial Payment'])

const hasBalanceDue = (student) => Number(student.balanceAmount) > 0

// Derives the Yes/No columns of the Sales Action Pending table. Reminders are only needed while
// the payment type uses that plan and a balance is still outstanding.
export function getSalesFlags(student) {
  return {
    discount: Number(student.discountGiven) > 0,
    downPayment: Boolean(student.financialDetailsTypes?.includes('Credit_Booking_Amount')),
    emiDetails: /EMI/.test(student.paymentType),
    partialReminders: PARTIAL_PAYMENT_TYPES.has(student.paymentType) && hasBalanceDue(student),
    subscriptionReminders: student.paymentType === 'Subscription' && hasBalanceDue(student),
  }
}
