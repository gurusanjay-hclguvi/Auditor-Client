// Fake CC-verification payloads: the system side plus a "scraped from the CC" side, which is
// the system side with a few deliberate mismatches injected to demonstrate flagging.
// `pointsCovered` lists which required points the CC mail covered (see REQUIRED_CC_POINTS in
// utils/auditChecks.js).
const ALL_POINTS = ['fee', 'paymentPlan', 'startDate', 'batchTiming', 'medium', 'refundPolicy']

function setAtPath(target, path, value) {
  const parts = path.split('.')
  const last = parts.pop()
  parts.reduce((node, part) => node[part], target)[last] = value
}

function ccRecord({
  paymentMode,
  partialSplitUpCategory = '',
  system,
  mismatches = {},
  pointsCovered = ALL_POINTS,
}) {
  const scraped = structuredClone(system)
  Object.entries(mismatches).forEach(([path, value]) => setAtPath(scraped, path, value))
  return { paymentMode, partialSplitUpCategory, system, scraped, pointsCovered }
}

const onlineWeekday = { time: '7PM', mode: 'Online - Weekday', medium: 'English' }

export const MOCK_CC_VERIFICATION = {
  'stu-1001': ccRecord({
    paymentMode: 'full',
    system: {
      personal: {
        learnerName: 'Aarav Test',
        email: 'aarav.test@example.com',
        contactNumber: '+910000000001',
      },
      courseDetails: {
        courseName: 'Zen Student Program - Full Stack Development',
        duration: '6 months',
        startDate: 'June 15th',
        ...onlineWeekday,
      },
      payment: { totalFee: '₹73800', downPayment: '₹999 (Non-Refundable)' },
    },
  }),
  'stu-1002': ccRecord({
    paymentMode: 'partial',
    partialSplitUpCategory: '40-30-30',
    system: {
      personal: {
        learnerName: 'Diya Sample',
        email: 'diya.sample@example.com',
        contactNumber: '+910000000002',
      },
      courseDetails: {
        courseName: 'Zen UI/UX Program',
        duration: '4 months',
        startDate: 'May 20th',
        ...onlineWeekday,
      },
      payment: {
        totalFee: '₹75000',
        downPayment: '₹999 (Non-Refundable)',
        installments: [
          { percentage: '40%', dueDate: '14/05/2025', amount: '₹30000' },
          { percentage: '30%', dueDate: '14/06/2025', amount: '₹22000' },
          { percentage: '30%', dueDate: '14/07/2025', amount: '₹22001' },
        ],
      },
    },
    mismatches: { 'payment.installments.1.amount': '₹22500' },
  }),
  'stu-1003': ccRecord({
    paymentMode: 'subscription',
    partialSplitUpCategory: '25-25-25-25',
    system: {
      personal: {
        learnerName: 'Kabir Demo',
        email: 'kabir.demo@example.com',
        contactNumber: '+910000000003',
      },
      courseDetails: {
        courseName: 'Zen Student Program - Full Stack Development',
        duration: '6 months',
        startDate: 'December 8th',
        ...onlineWeekday,
      },
      payment: {
        totalFee: '₹78800',
        downPayment: '₹2499 (Non-Refundable)',
        installments: [
          { percentage: '25%', dueDate: '16/12/2025', amount: '₹18768' },
          { percentage: '25%', dueDate: '16/01/2026', amount: '₹19178' },
          { percentage: '25%', dueDate: '16/02/2026', amount: '₹19178' },
          { percentage: '25%', dueDate: '16/03/2026', amount: '₹19177' },
        ],
      },
    },
    mismatches: { 'personal.contactNumber': '+910000000030' },
  }),
  'stu-1005': ccRecord({
    paymentMode: 'emi',
    system: {
      personal: {
        learnerName: 'Rohan Mock',
        email: 'rohan.mock@example.com',
        contactNumber: '+910000000005',
      },
      courseDetails: {
        courseName: 'Zen Student Program',
        duration: '6 months',
        startDate: 'September 7th',
        ...onlineWeekday,
      },
      payment: {
        totalFee: '₹78800',
        downPayment: '₹1000 (Non-Refundable)',
        emi: { loanAmount: '₹77800', monthlyEmi: '₹6500', roi: '0%', dueDate: '5th October' },
      },
    },
    mismatches: { 'payment.emi.monthlyEmi': '₹6800' },
  }),
  'stu-1006': ccRecord({
    paymentMode: 'emiPartial',
    partialSplitUpCategory: '50-50',
    system: {
      personal: {
        learnerName: 'Sana Example',
        email: 'sana.example@example.com',
        contactNumber: '+910000000006',
      },
      courseDetails: {
        courseName: 'Zen Data Science Program',
        duration: '6 months',
        startDate: 'September 7th',
        ...onlineWeekday,
      },
      payment: {
        totalFee: '₹85999',
        downPayment: '₹999 (Non-Refundable)',
        emi: { loanAmount: '₹48000', monthlyEmi: '₹2491', roi: '24.5%', dueDate: '5th October' },
        installments: [
          { percentage: '50%', dueDate: '04/10/2026', amount: '₹18500' },
          { percentage: '50%', dueDate: '04/11/2026', amount: '₹18500' },
        ],
      },
    },
    mismatches: { 'courseDetails.medium': 'Tamil' },
    pointsCovered: ALL_POINTS.filter((point) => point !== 'refundPolicy'),
  }),
}
