// Fake discount requests (DiscountData), keyed by lead: the lead's latest request as
// GET /sales-audit/leads/:id/audit returns it in `discount`. Meera's request is still pending, so
// her "Discount approved" check fails.
const hoursAgo = (hours) => Math.floor(Date.now() / 1000) - hours * 60 * 60

export const MOCK_DISCOUNTS = {
  'stu-1001': {
    status: 'Approved',
    actualCourseFee: '78800',
    requestedCourseFee: '73800',
    discountValue: '5000',
    approvedAt: hoursAgo(62),
  },
  'stu-1004': {
    status: 'Pending',
    actualCourseFee: '87999',
    requestedCourseFee: '85999',
    discountValue: '2000',
    approvedAt: null,
  },
}
