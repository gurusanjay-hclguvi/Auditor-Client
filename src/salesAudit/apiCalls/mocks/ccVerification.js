import { MOCK_STUDENTS } from './students'
import { getPaymentMode } from '../../utils/auditChecks'
import { toLeadRecord } from '../../utils/zohoLead'

// Fake CC-verification payloads for every lead with a CC: the system side built from the lead,
// plus a "scraped from the CC" side that copies it with a deliberate mismatch on every fourth
// lead. `pointsCovered` lists which required points the CC covered (see REQUIRED_CC_POINTS in
// utils/auditChecks.js); every fifth CC misses the refund policy.
const ALL_POINTS = ['fee', 'paymentPlan', 'startDate', 'batchTiming', 'medium', 'refundPolicy']

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
    const system = toLeadRecord(lead)
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
