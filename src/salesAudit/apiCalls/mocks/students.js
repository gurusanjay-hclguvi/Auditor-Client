import ZOHO_LEADS from './zohoLeads.json'
import { fromZohoLead, parseZohoDate, toPayments } from '../../utils/zohoLead'

// Mock leads: zohoLeads.json is a real Zoho export anonymized by scripts/anonymizeZohoSample.mjs
// (fake names, contacts, ids and links; structure, cases, amounts and statuses kept). It covers
// every payment type Zoho sends: Direct - Full / Partial Payment, Intra Month Partial,
// EMI - 6 / 12 / 18 / 24 Month and a lead with no payment type, with converted / not converted /
// dropped statuses, Active / Inactive / Paid partial reminders and Disbursed / Rejected EMIs.
//
// The export is from early 2026, so every date is shifted by the same number of days to end
// yesterday: trends, "time in SAP" and due dates then look current. Relative spacing is kept.
//
// Fields the export doesn't carry yet, filled in here:
//   auditCoordinator  the auditor the lead is assigned to (mock: auditor1-3@example.com in turn,
//                     every eighth lead unassigned); kept as-is when the export has it
//   zenId, onboardCoordinator
//   CourseDiscountDetails  discount requests on partial plans paid in the same month (two
//                     Approved, one Requested)
//   batchData, salesFrom, terms&conditions, promoCode, admissionDetails.admissionform, medium,
//                     campaign  lead details used by the Leads filters
//   recheckDetails    rechecks raised in Zoho (open "Confirmation Call" tickets on converted
//                     leads without a CC, one multi-category ticket, one closed)
//   ccUploadedAt      Unix seconds, added by the backend (mock: a few hours after enrollment
//                     when there is a CC)
// `escalation` comes from mailSimulator and `ccResponse` from MOCK_CC_RESPONSES.

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR = 60 * 60
const MOCK_AUDITORS = ['auditor1@example.com', 'auditor2@example.com', 'auditor3@example.com']
const mockCoordinator = (index) => (index % 8 === 7 ? null : MOCK_AUDITORS[index % MOCK_AUDITORS.length])
const MOCK_ONBOARDERS = ['onboard1@example.com', 'onboard2@example.com']

const toDay = (value) => value.slice(0, 10)
const latestPaymentDate = ZOHO_LEADS.flatMap((lead) => lead.financialDetails)
  .map((record) => record.paymentDate)
  .filter(Boolean)
  .sort()
  .at(-1)
const shiftDays = Math.round(
  (Date.now() - DAY_MS - Date.parse(`${toDay(latestPaymentDate)}T00:00:00Z`)) / DAY_MS,
)

// "2026-01-01" / "2026-02-01 10:00:02.0" moved by shiftDays; anything else unchanged.
function shift(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return value
  const day = new Date(Date.parse(`${toDay(value)}T00:00:00Z`) + shiftDays * DAY_MS)
  return day.toISOString().slice(0, 10) + value.slice(10)
}

function shiftLead(lead, index) {
  const shifted = {
    ...lead,
    auditCoordinator: lead.auditCoordinator ?? mockCoordinator(index),
    dateOfEnrollment: shift(lead.dateOfEnrollment),
    financialDetails: lead.financialDetails.map((record) => ({
      ...record,
      paymentDate: shift(record.paymentDate),
      verifiedDate: shift(record.verifiedDate),
    })),
    partialReminders: lead.partialReminders.map((reminder) => ({
      ...reminder,
      dueDate: shift(reminder.dueDate),
      linkCreatedDateTime: shift(reminder.linkCreatedDateTime),
      paidDateTime: shift(reminder.paidDateTime),
    })),
    EMIdetails: lead.EMIdetails.map((emi) => ({ ...emi, applicationDate: shift(emi.applicationDate) })),
  }
  const enrolledAt = parseZohoDate(shifted.dateOfEnrollment)
  if (shifted.confirmationCall && enrolledAt) {
    shifted.ccUploadedAt = enrolledAt + (6 + (index % 5) * 9) * HOUR
  }
  return shifted
}

// Batch, marketing and admission details (for the Leads filters), kept when the export has them.
const MEDIUMS = ['DS-Software-Interest-OTP', 'Webinar-Registrants', 'Retarget-Visitors']
const CAMPAIGNS = ['DS-Tamil-Video-June', 'No-Coding-Career-Switch', 'Weekend-Batch-Promo']
function withLeadDetails(lead, index) {
  // Dates are already shifted here; the batch starts a week after enrollment.
  const enrolled = lead.dateOfEnrollment
  const batchStart = enrolled
    ? new Date(Date.parse(`${toDay(enrolled)}T00:00:00Z`) + 7 * DAY_MS).toISOString().slice(0, 10)
    : ''
  return {
    batchData: lead.batchData ?? {
      batchName: `${(lead.product ?? 'ZEN').split('_').slice(0, 2).join('')}-${lead.modeOfStudy === 'WeekEND' ? 'WE' : 'WD'}-B${20 + (index % 9)}`,
      startDate: batchStart,
    },
    salesFrom: lead.salesFrom ?? (index % 3 === 0 ? 'South Mainboot' : 'South Inside Sales'),
    'terms&conditions': lead['terms&conditions'] ?? (index % 4 === 0 ? 'No' : 'Yes'),
    promoCode: lead.promoCode ?? (index % 6 === 0 ? `ZEN${500 + index}` : ''),
    medium: lead.medium || MEDIUMS[index % MEDIUMS.length],
    campaign: lead.campaign || CAMPAIGNS[index % CAMPAIGNS.length],
    admissionDetails: {
      ...lead.admissionDetails,
      admissionform: lead.admissionDetails?.admissionform ?? (index % 5 === 0 ? 'not found' : 'Filled'),
    },
  }
}

// Discount requests: partial plans with willLeadPayinSameMonth "Yes" (as Zoho sends them).
function withDiscountRequests(leads) {
  let count = 0
  return leads.map((lead) => {
    if (lead.CourseDiscountDetails || !/Partial/.test(lead.paymenttype ?? '')) return lead
    if (lead.willLeadPayinSameMonth !== 'Yes' || !lead.courseFee) return lead
    count += 1
    const discountValue = Math.round(lead.courseFee * 0.1)
    return {
      ...lead,
      CourseDiscountDetails: [
        {
          requestedCourseFee: lead.courseFee,
          requestedperson: `approver${count}@example.com`,
          actualCourseFee: lead.courseFee + discountValue,
          course: lead.product,
          discountValue,
          paymentType: lead.paymenttype,
          status: count % 3 === 0 ? 'Requested' : 'Approved',
        },
      ],
    }
  })
}

// Zoho-side rechecks (recheckDetails), in the shape Zoho sends them.
function zohoRecheck(lead, number, pendingList, comments, ticketStatus = 'Open', attempt = 1) {
  const day = lead.dateOfEnrollment ?? ''
  return {
    auditComments: comments,
    newccLink: '',
    requestPerson: lead.auditCoordinator ?? MOCK_AUDITORS[0],
    ticketStatus,
    recheckattempt: attempt,
    recheckDate: day ? `${day} 15:51:26.0` : '',
    SRID: `SR-0${4150 + number}`,
    pendingList,
  }
}

function withZohoRechecks(leads) {
  const needsCc = leads.filter(
    (lead) => lead.status === 'converted' && !lead.confirmationCall && lead.paymenttype,
  )
  const withCc = leads.filter((lead) => lead.confirmationCall && lead.paymenttype)
  const planned = new Map()
  const add = (lead, recheck) => {
    if (lead) planned.set(lead.superleapId, [...(planned.get(lead.superleapId) ?? []), recheck])
  }
  needsCc.slice(0, 2).forEach((lead, index) =>
    add(
      lead,
      zohoRecheck(
        lead,
        index + 1,
        ['Confirmation Call'],
        'Verification mail link is missing in Zoho. Please verify and include the CC link.',
      ),
    ),
  )
  add(
    withCc[0],
    withCc[0] &&
      zohoRecheck(
        withCc[0],
        3,
        ['Payment', 'Discount Approval'],
        'Discount on the payment plan does not match the approved request; confirm with the learner.',
        'Open',
        2,
      ),
  )
  add(
    withCc[1],
    withCc[1] &&
      zohoRecheck(withCc[1], 4, ['EMI'], 'EMI tenure in the CC differs from the loan record.', 'Closed'),
  )
  return leads.map((lead) =>
    planned.has(lead.superleapId) && !lead.recheckDetails
      ? { ...lead, recheckDetails: planned.get(lead.superleapId) }
      : lead,
  )
}

export const MOCK_ZOHO_LEADS = withZohoRechecks(
  withDiscountRequests(
    ZOHO_LEADS.map(shiftLead).map((lead, index) => ({
      ...lead,
      zenId: lead.zenId ?? String(76000 + index),
      onboardCoordinator: lead.onboardCoordinator ?? MOCK_ONBOARDERS[index % MOCK_ONBOARDERS.length],
      ...withLeadDetails(lead, index),
    })),
  ),
)

// The leads and payments as the pages use them (through the same adapter as the real API).
export const MOCK_STUDENTS = MOCK_ZOHO_LEADS.map(fromZohoLead)
export const MOCK_PAYMENTS = MOCK_ZOHO_LEADS.flatMap(toPayments)
