// Fake EMI vendor (loan partner) records, keyed by lead. Mock-only until the vendor integration
// exists. Sana's vendor record quotes a different monthly EMI from Zoho and the CC mail.
export const MOCK_VENDOR_EMI = {
  'stu-1004': {
    vendor: 'Loan Partner',
    loanAmount: '₹55999',
    monthlyEmi: '₹18667',
    roi: '0%',
    dueDate: '5th October',
    tenure: '3 months',
    disbursalStatus: 'Disbursed',
  },
  'stu-1005': {
    vendor: 'Loan Partner',
    loanAmount: '₹77800',
    monthlyEmi: '₹6500',
    roi: '0%',
    dueDate: '5th October',
    tenure: '12 months',
    disbursalStatus: 'Disbursed',
  },
  'stu-1006': {
    vendor: 'Loan Partner',
    loanAmount: '₹48000',
    monthlyEmi: '₹2600',
    roi: '24.5%',
    dueDate: '5th October',
    tenure: '24 months',
    disbursalStatus: 'Approved',
  },
}
