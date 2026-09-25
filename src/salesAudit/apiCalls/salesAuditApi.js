import axios from 'axios'
import { BaseUrl } from '../../config'
import { MOCK_PAYMENTS, MOCK_STUDENTS } from './mocks/students'
import { MOCK_CC_VERIFICATION } from './mocks/ccVerification'
import { MOCK_CC_RESPONSES, MOCK_RECHECKS } from './mocks/rechecks'
import { HISTORICAL_ALERTS } from './mocks/history'
import { MOCK_VENDOR_EMI } from './mocks/vendorEmi'
import { MOCK_AUDITS } from './mocks/audits'
import { MOCK_USERS, devUsersFromLeads, findMockUserByToken, userFromDevToken } from './mocks/users'
import {
  getEscalation,
  getEscalationLog,
  getReminderLog,
  runRecheckReminderSweep,
  runEscalationSweep,
  sendManualReminder,
  sendMockMail,
} from './mocks/mailSimulator'
import { getContactEmail } from '../utils/contacts'
import { getCategoryLabel } from '../utils/recheckStatus'
import { getPaymentMode } from '../utils/auditChecks'
import { canAudit } from '../utils/leadStatus'
import {
  discountFromRequest,
  normalizeLead,
  normalizePayment,
  toLeadRecord,
} from '../utils/zohoLead'
import { fromZohoLead } from '../utils/zohoLead'

// Serve fixtures until the Go backend exists; set VITE_USE_MOCK_API=false to hit the real API.
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'
const MOCK_DELAY_MS = 600

async function request(token, method, path, body) {
  try {
    const { data: responseBody } = await axios({
      method,
      url: `${BaseUrl}/sales-audit${path}`,
      data: body,
      headers: { Authorization: token },
    })
    if (responseBody.status !== 'success') throw new Error(responseBody.message || 'Request failed')
    return responseBody.data
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Request failed', {
      cause: error,
    })
  }
}

const get = (token, path) => request(token, 'get', path)
const post = (token, path, body) => request(token, 'post', path, body)

function mockResponse(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (data === undefined) reject(new Error('Record not found'))
      else resolve(structuredClone(data))
    }, MOCK_DELAY_MS)
  })
}

function mockError(message) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), MOCK_DELAY_MS))
}

const nowSeconds = () => Math.floor(Date.now() / 1000)

const studentPath = (studentId) => `/students/${encodeURIComponent(studentId)}`
const leadPath = (leadId) => `/leads/${encodeURIComponent(leadId)}`

// Every lead the API returns goes through normalizeLead (utils/zohoLead.js): the backend sends a
// flat lead, the mock Zoho documents (already mapped). Pages only see the normalized shape.
const withMockAudit = (student) => ({ ...student, audit: MOCK_AUDITS[student.id] ?? null })

// Who is signed in: { hash, name, email, role: "auditor" | "bdm" | "bda" }. The backend resolves
// it from the token (`auth` in the mock auth middleware); the mock reads the email in the dev
// token ("dev-mock-token:<email>").
export function getCurrentUser(token) {
  if (!USE_MOCK_API) {
    // A dev token (the dev shell's Mock user picker) names its user and role; the backend's
    // /sales-audit/me is still a stub that calls everyone an auditor, so it is only asked for
    // real (Zen) tokens.
    const devUser = userFromDevToken(token)
    return devUser ? Promise.resolve(devUser) : get(token, '/me')
  }
  const user = findMockUserByToken(token)
  return user ? mockResponse(user) : mockError('Unknown user for this token')
}

// Dev accounts for the dev shell's Mock user picker: the mock users, or (against the backend)
// the BDAs and BDMs on its leads plus the mock auditors.
export function getDevUsers(token) {
  if (USE_MOCK_API) return mockResponse(MOCK_USERS)
  return getLeadSummaries(token).then((leads) => devUsersFromLeads(leads))
}

// Returns { leads, mailsSentThisSweep }. The mock runs the escalation sweep on every fetch,
// standing in for the backend's scheduled job.
export function getLeads(token) {
  if (USE_MOCK_API) {
    const leads = MOCK_STUDENTS.map(withMockAudit)
    const mailsSentThisSweep = runEscalationSweep(leads, Date.now())
    return mockResponse({
      leads: leads.map((lead) => ({
        ...lead,
        escalation: getEscalation(lead.id),
        ccResponse: MOCK_CC_RESPONSES[lead.id] ?? null,
      })),
      mailsSentThisSweep,
    })
  }
  return get(token, '/leads').then((response) => ({
    ...response,
    leads: response.leads.map(normalizeLead),
  }))
}

// Mails the lead's BDA and Accounts now; resolves to the new escalation record.
export function sendLeadReminder(token, leadId) {
  if (USE_MOCK_API) {
    const student = MOCK_STUDENTS.find((candidate) => candidate.id === leadId)
    return mockResponse(student && sendManualReminder(student, Date.now()))
  }
  return post(token, `${leadPath(leadId)}/send-reminder`)
}

const findMockLead = (leadId) => MOCK_STUDENTS.find((student) => student.id === leadId)

const toLeadSummary = (student) => ({
  id: student.id,
  studentFullName: student.studentFullName,
  course: student.course,
  saleOwner: student.saleOwner,
  saleOwnerManager: student.saleOwnerManager,
  confirmationCallLink: student.confirmationCallLink,
  ccResponse: MOCK_CC_RESPONSES[student.id] ?? null,
})

// Every lead with its CC state, for the recheck lead picker and the CC Status tab.
export function getLeadSummaries(token) {
  if (USE_MOCK_API) return mockResponse(MOCK_STUDENTS.map(toLeadSummary))
  return get(token, '/leads/summaries').then((leads) => leads.map(normalizeLead))
}

// Rechecks raised in the app plus the ones Zoho sends inside each lead (recheckDetails), newest
// first. Zoho's carry `source: "zoho"` and an SR ID.
const zohoRechecks = (leads) => leads.flatMap((lead) => lead.rechecks ?? [])
const newestFirst = (rechecks) => [...rechecks].sort((a, b) => (b.raisedAt ?? 0) - (a.raisedAt ?? 0))

function mergeRechecks(appRechecks, leads) {
  const known = new Set(appRechecks.map((recheck) => recheck.id))
  return newestFirst([
    ...appRechecks,
    ...zohoRechecks(leads).filter((recheck) => !known.has(recheck.id)),
  ])
}

export function getRechecks(token) {
  if (USE_MOCK_API) {
    runRecheckReminderSweep(MOCK_RECHECKS, MOCK_STUDENTS, Date.now())
    return mockResponse(mergeRechecks(MOCK_RECHECKS, MOCK_STUDENTS))
  }
  return Promise.all([get(token, '/rechecks'), get(token, '/leads')]).then(([rechecks, response]) =>
    mergeRechecks(rechecks, response.leads.map(normalizeLead)),
  )
}

// Raising a recheck alerts the lead's BDA and BDM; resolves to the new recheck. A recheck covers
// one or more categories.
export function raiseRecheck(token, { leadId, categories, notes }) {
  if (USE_MOCK_API) {
    const lead = findMockLead(leadId)
    if (!lead) return mockResponse(undefined)
    const now = Date.now()
    const categoryLabel = categories.map(getCategoryLabel).join(', ')
    const recheck = {
      id: `rc-${MOCK_RECHECKS.length + 1}`,
      leadId,
      categories,
      notes,
      status: 'open',
      raisedBy: 'Audit Team',
      raisedAt: Math.floor(now / 1000),
      resolvedAt: null,
      alert: sendMockMail(
        {
          to: [getContactEmail(lead.saleOwner), getContactEmail(lead.saleOwnerManager)],
          subject: `Recheck raised (${categoryLabel}): ${lead.studentFullName}`,
        },
        now,
      ),
    }
    MOCK_RECHECKS.unshift(recheck)
    return mockResponse(recheck)
  }
  // The backend stores one category per recheck: send the first, and name the others in the
  // notes so nothing is lost. `categories` is sent too for when it accepts several.
  const [category, ...others] = categories
  const otherLabels = others.map(getCategoryLabel).join(', ')
  return post(token, '/rechecks', {
    leadId,
    category,
    categories,
    notes: others.length ? `${notes}
(Also: ${otherLabels})` : notes,
  })
}

export function resolveRecheck(token, recheckId) {
  if (USE_MOCK_API) {
    const recheck = MOCK_RECHECKS.find((candidate) => candidate.id === recheckId)
    if (recheck) Object.assign(recheck, { status: 'resolved', resolvedAt: nowSeconds() })
    return mockResponse(recheck)
  }
  return post(token, `/rechecks/${encodeURIComponent(recheckId)}/resolve`)
}

// BDA's answer for a pending CC. "mailNotSent" alerts the BDA automatically.
export function updateCcResponse(token, leadId, response) {
  if (USE_MOCK_API) {
    const lead = findMockLead(leadId)
    if (!lead) return mockResponse(undefined)
    const now = Date.now()
    MOCK_CC_RESPONSES[leadId] = {
      response,
      updatedAt: Math.floor(now / 1000),
      alert:
        response === 'mailNotSent'
          ? sendMockMail(
              {
                to: [getContactEmail(lead.saleOwner)],
                subject: `CC mail not sent: ${lead.studentFullName}`,
              },
              now,
            )
          : null,
    }
    return mockResponse(MOCK_CC_RESPONSES[leadId])
  }
  return post(token, `${leadPath(leadId)}/cc-response`, { response })
}

// Rechecks, payments and every alert mail, for trends / patterns / response times. The backend
// returns the last 60 days by default, enough to compare 30 days with the 30 before.
export function getAuditHistory(token) {
  if (!USE_MOCK_API) {
    return get(token, '/audit-history').then((history) => ({
      ...history,
      payments: history.payments.map(normalizePayment),
    }))
  }
  runRecheckReminderSweep(MOCK_RECHECKS, MOCK_STUDENTS, Date.now())
  const recheckAlerts = MOCK_RECHECKS.filter((recheck) => recheck.alert).map((recheck) => ({
    ...recheck.alert,
    leadId: recheck.leadId,
    kind: 'recheck',
  }))
  const ccAlerts = Object.entries(MOCK_CC_RESPONSES)
    .filter(([, ccResponse]) => ccResponse.alert)
    .map(([leadId, ccResponse]) => ({ ...ccResponse.alert, leadId, kind: 'ccNotSent' }))
  return mockResponse({
    rechecks: mergeRechecks(MOCK_RECHECKS, MOCK_STUDENTS),
    payments: MOCK_PAYMENTS,
    alerts: [
      ...HISTORICAL_ALERTS,
      ...getEscalationLog(),
      ...getReminderLog(),
      ...recheckAlerts,
      ...ccAlerts,
    ],
  })
}

// Zoho side of the audit: the CC record's system data when there is one, else the lead fields.
function getMockZohoRecord(lead, ccRecord) {
  const zoho = ccRecord
    ? structuredClone(ccRecord.system)
    : {
        personal: {
          learnerName: lead.studentFullName,
          email: lead.email,
          contactNumber: lead.primaryPhone,
        },
        courseDetails: { courseName: lead.course },
        payment: { totalFee: `₹${lead.courseValue}` },
      }
  const tenure = lead.paymentType?.match(/EMI - (\d+) Month/)?.[1]
  if (/EMI/.test(lead.paymentType ?? '')) {
    const { loanAmount, monthlyEmi, roi, dueDate } = lead.emiDetails ?? {}
    zoho.payment.emi = {
      loanAmount,
      monthlyEmi,
      roi,
      dueDate,
      ...zoho.payment.emi,
      tenure: tenure ? `${tenure} months` : '',
      disbursalStatus: lead.emiStatus,
    }
  }
  return zoho
}

// Everything the Lead Audit Workspace compares for one lead.
export function getLeadAudit(token, leadId) {
  if (!USE_MOCK_API) {
    return get(token, `${leadPath(leadId)}/audit`).then((audit) => {
      const normalized = normalizeLead(audit.lead)
      // The backend sends the discount request next to the lead.
      const lead = audit.discount
        ? { ...normalized, discount: discountFromRequest(audit.discount, normalized.discountGiven) }
        : normalized
      return { ...audit, lead, rechecks: mergeRechecks(audit.rechecks ?? [], [lead]) }
    })
  }
  const student = findMockLead(leadId)
  if (!student) return mockResponse(undefined)
  runRecheckReminderSweep(MOCK_RECHECKS, MOCK_STUDENTS, Date.now())
  const ccRecord = MOCK_CC_VERIFICATION[leadId]
  const vendor = MOCK_VENDOR_EMI[leadId]
  const { vendor: vendorName, ...vendorEmi } = vendor ?? {}
  return mockResponse({
    lead: {
      ...withMockAudit(student),
      escalation: getEscalation(leadId),
      ccResponse: MOCK_CC_RESPONSES[leadId] ?? null,
    },
    sources: {
      zoho: getMockZohoRecord(student, ccRecord),
      cc: student.confirmationCallLink && ccRecord ? ccRecord.scraped : null,
      vendor: vendor ? { payment: { emi: vendorEmi } } : null,
    },
    vendorName: vendorName ?? '',
    paymentMode: ccRecord?.paymentMode ?? getPaymentMode(student.paymentType),
    partialSplitUpCategory: ccRecord?.partialSplitUpCategory ?? student.partialSplitUpCategory,
    pointsCovered: ccRecord?.pointsCovered ?? [],
    rechecks: mergeRechecks(
      MOCK_RECHECKS.filter((recheck) => recheck.leadId === leadId),
      [student],
    ),
  })
}

// Auditor audits a lead in Awaiting (every payment verified), moving it to Audited;
// `overrideReason` is required when the checklist didn't fully pass. Resolves to the audit record.
export function markLeadAudited(token, leadId, { overrideReason = '' } = {}) {
  if (!USE_MOCK_API) return post(token, `${leadPath(leadId)}/mark-audited`, { overrideReason })
  const lead = findMockLead(leadId)
  if (!lead) return mockResponse(undefined)
  if (!canAudit(lead) || MOCK_AUDITS[leadId]) {
    return mockError('Only leads in Awaiting Audit can be audited')
  }
  MOCK_AUDITS[leadId] = { auditedAt: nowSeconds(), auditedBy: 'Audit Team', overrideReason }
  return mockResponse(MOCK_AUDITS[leadId])
}

// The lead with its payment plan (`schedule`: partial or subscription reminders).
export function getStudent(token, studentId) {
  if (USE_MOCK_API) return mockResponse(findMockLead(studentId))
  return get(token, studentPath(studentId)).then(normalizeLead)
}

// The lead's payment records as rows, oldest first.
// The lead's payment rows, oldest first.
export function getStudentPayments(token, studentId) {
  if (USE_MOCK_API) {
    return mockResponse(MOCK_PAYMENTS.filter((payment) => payment.leadId === studentId))
  }
  return get(token, `${studentPath(studentId)}/payments`)
}

// Check source: the lead's record next to its CC source (confirmation-call link). The backend's
// cc-verification answers only once a CC has been extracted, so its record is used when there is
// one and the lead's own record otherwise.
export function getCcVerification(token, studentId) {
  if (!USE_MOCK_API) {
    return Promise.all([
      get(token, `${studentPath(studentId)}/cc-verification`).catch(() => null),
      getStudent(token, studentId),
    ]).then(([verification, lead]) => {
      const pdfUrl = verification?.pdfUrl || lead.confirmationCallLink
      if (!pdfUrl) throw new Error('No CC source has been uploaded for this lead yet')
      return {
        paymentMode: verification?.paymentMode ?? getPaymentMode(lead.paymentType),
        partialSplitUpCategory: verification?.partialSplitUpCategory ?? lead.partialSplitUpCategory,
        system: verification?.system ?? toLeadRecord(lead),
        pdfUrl,
      }
    })
  }
  // Like the backend: the PDF link is the lead's CC link; no link means no PDF (404).
  const record = MOCK_CC_VERIFICATION[studentId]
  const pdfUrl = findMockLead(studentId)?.confirmationCallLink
  if (!record || !pdfUrl) return mockResponse(undefined)
  const { paymentMode, partialSplitUpCategory, system } = record
  return mockResponse({ paymentMode, partialSplitUpCategory, system, pdfUrl })
}
