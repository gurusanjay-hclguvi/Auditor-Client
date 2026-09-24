import { MOCK_STUDENTS } from './students'
import { getPaymentMode } from '../../utils/auditChecks'
import { displayZohoDate } from '../../utils/zohoLead'

// Fake CC-verification payloads for every lead with a CC: the system side built from the lead,
// plus a "scraped from the CC" side that copies it with a deliberate mismatch on every fourth
// lead. `pointsCovered` lists which required points the CC covered (see REQUIRED_CC_POINTS in
// utils/auditChecks.js); every fifth CC misses the refund policy.
const ALL_POINTS = ['fee', 'paymentPlan', 'startDate', 'batchTiming', 'medium', 'refundPolicy']

const rupees = (value) => (value === '' || value == null ? '' : `₹${value}`)

function systemRecord(lead) {
  const splits = lead.partialSplitUpCategory.split('-').filter(Boolean)
  const installments = lead.schedule.items.map((item, index) => ({
    percentage: splits[index + 1] ? `${splits[index + 1]}%` : '',
    dueDate: displayZohoDate(item.dueDate),
    amount: rupees(item.amount),
  }))
  const emi = lead.emiDetails
  return {
    personal: {
      learnerName: lead.studentFullName,
      email: lead.email,
      contactNumber: lead.primaryPhone,
    },
    courseDetails: {
      courseName: lead.course,
      mode: lead.modeOfStudy,
      medium: lead.preferredLanguage,
    },
    payment: {
      totalFee: rupees(lead.courseValue),
      downPayment: rupees(lead.credits.bookingAmount?.amount),
      ...(installments.length && { installments }),
      ...(emi && /EMI/.test(lead.paymentType) && {
        emi: { loanAmount: emi.loanAmount, monthlyEmi: emi.monthlyEmi, roi: emi.roi },
      }),
    },
  }
}

// One deliberate difference per affected lead, rotating through the kinds of mistakes a CC has.
const MISMATCHES = [
  (scraped) => {
    scraped.personal.contactNumber = `${scraped.personal.contactNumber}0`
  },
  (scraped) => {
    scraped.courseDetails.medium = scraped.courseDetails.medium === 'Tamil' ? 'English' : 'Tamil'
  },
  (scraped) => {
    scraped.payment.totalFee = `${scraped.payment.totalFee}0`
  },
  (scraped) => {
    if (scraped.payment.emi) scraped.payment.emi.monthlyEmi = `${scraped.payment.emi.monthlyEmi}5`
    else scraped.courseDetails.mode = 'WeekDAY'
  },
]

export const MOCK_CC_VERIFICATION = Object.fromEntries(
  MOCK_STUDENTS.filter((lead) => lead.confirmationCallLink).map((lead, index) => {
    const system = systemRecord(lead)
    const scraped = structuredClone(system)
    if (index % 4 === 0) MISMATCHES[(index / 4) % MISMATCHES.length](scraped)
    return [
      lead.id,
      {
        paymentMode: getPaymentMode(lead.paymentType),
        partialSplitUpCategory: lead.partialSplitUpCategory,
        system,
        scraped,
        pointsCovered:
          index % 5 === 2 ? ALL_POINTS.filter((point) => point !== 'refundPolicy') : ALL_POINTS,
      },
    ]
  }),
)
