import { getPaymentMode } from './auditChecks'

const hasBalanceDue = (student) => Number(student.balanceAmount) > 0

// Derives the Yes/No columns of the Sales Action Pending table. Reminders are only needed while
// the payment type uses that plan and a balance is still outstanding.
export function getSalesFlags(student) {
  return {
    discount: Boolean(student.discount),
    downPayment: Boolean(student.financialDetailsTypes?.includes('Credit_Booking_Amount')),
    // Only when Zoho sent EMIdetails; an EMI payment type alone doesn't count.
    emiDetails: Boolean(student.emiDetails),
    partialReminders:
      ['partial', 'emiPartial'].includes(getPaymentMode(student.paymentType)) &&
      hasBalanceDue(student),
    subscriptionReminders:
      getPaymentMode(student.paymentType) === 'subscription' && hasBalanceDue(student),
  }
}
