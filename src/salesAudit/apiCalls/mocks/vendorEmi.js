import { MOCK_STUDENTS } from './students'

// Fake EMI vendor (loan partner) records, keyed by lead: the vendor's copy of the lead's EMI
// application. Mock-only until the vendor integration exists. Every third one quotes a different
// monthly EMI from Zoho, so the "EMI terms match the vendor" check has something to catch.
export const MOCK_VENDOR_EMI = Object.fromEntries(
  MOCK_STUDENTS.filter((lead) => lead.emiDetails && /EMI/.test(lead.paymentType)).map(
    (lead, index) => {
      const emi = lead.emiDetails
      const monthly = Number(emi.monthlyEmi.replace(/[^\d.]/g, ''))
      return [
        lead.id,
        {
          vendor: emi.vendor,
          loanAmount: emi.loanAmount,
          monthlyEmi: index % 3 === 1 && monthly ? `₹${monthly + 200}` : emi.monthlyEmi,
          roi: emi.roi,
          tenure: emi.tenure,
          disbursalStatus: emi.status,
        },
      ]
    },
  ),
)
