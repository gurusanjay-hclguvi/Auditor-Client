import axios from 'axios'
import { BaseUrl } from '../../config'
import { MOCK_STUDENTS } from './mocks/students'
import { MOCK_PAYMENTS } from './mocks/payments'
import { MOCK_CC_VERIFICATION } from './mocks/ccVerification'
import { MOCK_CC_RESPONSES, MOCK_RECHECKS } from './mocks/rechecks'
import { HISTORICAL_ALERTS } from './mocks/history'
import { MOCK_VENDOR_EMI } from './mocks/vendorEmi'
import { MOCK_AUDITS } from './mocks/audits'
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
import { CREDIT_TYPES } from '../utils/leadStatus'
import { RECHECK_CATEGORIES } from '../utils/recheckStatus'
import { getPaymentMode } from '../utils/auditChecks'

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

const nowSeconds = () => Math.floor(Date.now() / 1000)

const studentPath = (studentId) => `/students/${encodeURIComponent(studentId)}`
const leadPath = (leadId) => `/leads/${encodeURIComponent(leadId)}`

// Latest record of each credit type, as the backend will return it on the lead.
function getMockCredits(studentId) {
  const payments = MOCK_PAYMENTS.filter((payment) => payment.studentId === studentId)
  return Object.fromEntries(
    Object.entries(CREDIT_TYPES).map(([key, type]) => {
      const latest = payments.filter((payment) => payment.type === type).at(-1)
      return [
        key,
        latest
          ? { amount: latest.amount, verified: latest.verified, paymentDate: latest.paymentDate }
          : null,
      ]
    }),
  )
}

const withMockCredits = (student) => ({
  ...student,
  credits: getMockCredits(student.id),
  audit: MOCK_AUDITS[student.id] ?? null,
})

// Returns { leads, mailsSentThisSweep }. The mock runs the escalation sweep on every fetch,
// standing in for the backend's scheduled job.
export function getLeads(token) {
  if (USE_MOCK_API) {
    const leads = MOCK_STUDENTS.map(withMockCredits)
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
  return get(token, '/leads')
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
  return get(token, '/leads/summaries')
}

export function getRechecks(token) {
  if (USE_MOCK_API) {
    runRecheckReminderSweep(MOCK_RECHECKS, MOCK_STUDENTS, Date.now())
    return mockResponse(MOCK_RECHECKS)
  }
  return get(token, '/rechecks')
}

// Raising a recheck alerts the lead's BDA and BDM; resolves to the new recheck.
export function raiseRecheck(token, { leadId, category, notes }) {
  if (USE_MOCK_API) {
    const lead = findMockLead(leadId)
    if (!lead) return mockResponse(undefined)
    const now = Date.now()
    const categoryLabel = RECHECK_CATEGORIES[category].label
    const recheck = {
      id: `rc-${MOCK_RECHECKS.length + 1}`,
      leadId,
      category,
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
  return post(token, '/rechecks', { leadId, category, notes })
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

// Rechecks, payments and every alert mail, for trends / patterns / response times.
// TODO: wire to backend once its structure is known; mock data only for now.
export function getAuditHistory() {
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
    rechecks: MOCK_RECHECKS,
    payments: MOCK_PAYMENTS.map(({ studentId, ...payment }) => ({ ...payment, leadId: studentId })),
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
    zoho.payment.emi = {
      ...lead.emiDetails,
      ...zoho.payment.emi,
      tenure: tenure ? `${tenure} months` : '',
      disbursalStatus: lead.emiStatus,
    }
  }
  return zoho
}

// Everything the Lead Audit Workspace compares for one lead.
// TODO: wire to backend once its structure is known; mock data only for now.
export function getLeadAudit(token, leadId) {
  const student = findMockLead(leadId)
  if (!student) return mockResponse(undefined)
  runRecheckReminderSweep(MOCK_RECHECKS, MOCK_STUDENTS, Date.now())
  const ccRecord = MOCK_CC_VERIFICATION[leadId]
  const vendor = MOCK_VENDOR_EMI[leadId]
  const { vendor: vendorName, ...vendorEmi } = vendor ?? {}
  return mockResponse({
    lead: {
      ...withMockCredits(student),
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
    rechecks: MOCK_RECHECKS.filter((recheck) => recheck.leadId === leadId),
  })
}

// Auditor verifies the lead, moving it to Awaiting; `overrideReason` is required when the
// checklist didn't fully pass. Resolves to the audit record.
// TODO: wire to backend once its structure is known; mock data only for now.
export function markLeadAudited(token, leadId, { overrideReason = '' } = {}) {
  if (!findMockLead(leadId)) return mockResponse(undefined)
  MOCK_AUDITS[leadId] = { auditedAt: nowSeconds(), auditedBy: 'Audit Team', overrideReason }
  return mockResponse(MOCK_AUDITS[leadId])
}

export function getStudent(token, studentId) {
  if (USE_MOCK_API) return mockResponse(MOCK_STUDENTS.find((student) => student.id === studentId))
  return get(token, studentPath(studentId))
}

export function getStudentPayments(token, studentId) {
  if (USE_MOCK_API) {
    return mockResponse(MOCK_PAYMENTS.filter((payment) => payment.studentId === studentId))
  }
  return get(token, `${studentPath(studentId)}/payments`)
}

export function getCcVerification(token, studentId) {
  if (USE_MOCK_API) return mockResponse(MOCK_CC_VERIFICATION[studentId])
  return get(token, `${studentPath(studentId)}/cc-verification`)
}
