import { getPaymentMode } from './auditChecks'

const hasBalanceDue = (student) => Number(student.balanceAmount) > 0

// Derives the Yes/No columns of the Sales Action Pending table. Reminders are only needed while
// the payment type uses that plan and a balance is still outstanding.
export function getSalesFlags(student) {
  return {
    discount: Boolean(student.discount),
    downPayment: Boolean(student.financialDetailsTypes?.includes('Credit_Booking_Amount')),
    // Zoho can send EMIdetails with a non-EMI plan too (an earlier loan application).
    emiDetails: Boolean(student.emiDetails) || /EMI/.test(student.paymentType),
    partialReminders:
      ['partial', 'emiPartial'].includes(getPaymentMode(student.paymentType)) &&
      hasBalanceDue(student),
    subscriptionReminders:
      getPaymentMode(student.paymentType) === 'subscription' && hasBalanceDue(student),
  }
}
