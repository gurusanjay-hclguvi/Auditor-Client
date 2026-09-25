import axios from 'axios'
import { BaseUrl } from '../../config'

// Every call to the Sales Audit backend (audit-checker-backend, /sales-audit/...). The token comes
// from Redux (state.reducers.commonData.authToken) and is sent as `Authorization: <token>`.
// Responses are {status, data} or {status, message}; errors reject with the backend's message.

async function request(token, method, path, { params, body } = {}) {
  try {
    const { data: responseBody } = await axios({
      method,
      url: `${BaseUrl}/sales-audit${path}`,
      params,
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

// Drops empty filters so the URL only carries what is set.
function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null && value !== false),
  )
}

const get = (token, path, params) => request(token, 'get', path, { params: cleanParams(params) })
const post = (token, path, body) => request(token, 'post', path, { body })
const put = (token, path, body) => request(token, 'put', path, { body })
const leadPath = (leadId) => `/leads/${encodeURIComponent(leadId)}`

// Who is signed in: the member (role, region, manager), what they may do and their team.
export const getMe = (token) => get(token, '/me')

// Members (auditor TL manages them)
export const getMembers = (token, role) => get(token, '/members', { role })
export const createMember = (token, member) => post(token, '/members', member)
export const updateMember = (token, memberId, changes) =>
  put(token, `/members/${encodeURIComponent(memberId)}`, changes)

// Leads. Filters: scope=mine|all, auditStatus, region, auditorEmail, bdaEmail, ccStatus, search,
// completedIn / recheckRaisedIn / recheckClosedIn (today|thisWeek|lastWeek|thisMonth|lastMonth),
// recheckCategory, recheckStatus, awaitingReaudit, page, pageSize. Returns {items, total, ...}.
export const getLeads = (token, filters) => get(token, '/leads', filters)
export const assignLeads = (token) => post(token, '/leads/assign')
export const getLead = (token, leadId) => get(token, leadPath(leadId))
export const getTimeline = (token, leadId) => get(token, `${leadPath(leadId)}/timeline`)
export const getAuditView = (token, leadId) => get(token, `${leadPath(leadId)}/audit`)
export const getCcVerification = (token, leadId) =>
  get(token, `${leadPath(leadId)}/cc-verification`)
export const getLeadAlerts = (token, leadId) => get(token, `${leadPath(leadId)}/alerts`)
export const completeAudit = (token, leadId, { checklist, comments }) =>
  post(token, `${leadPath(leadId)}/complete-audit`, { checklist, comments })
export const reassignLead = (token, leadId, auditorEmail) =>
  post(token, `${leadPath(leadId)}/reassign`, { auditorEmail })
export const takeUpLead = (token, leadId) => post(token, `${leadPath(leadId)}/take-up`)
export const sendReminder = (token, leadId) => post(token, `${leadPath(leadId)}/send-reminder`)

// Rechecks (tickets). Filters: scope=mine|all, status, view=raisedNotClosed|closedAuditPending|closed,
// category, auditorEmail, bdaEmail, leadId, raisedIn / closedIn presets.
export const getRechecks = (token, filters) => get(token, '/rechecks', filters)
// reasons: [{category, comments}], one per category.
export const raiseRecheck = (token, { leadId, reasons }) =>
  post(token, '/rechecks', { leadId, reasons })
export const closeRecheck = (token, recheckId, note) =>
  post(token, `/rechecks/${encodeURIComponent(recheckId)}/close`, { note })
// Leads by CC status (updated in Zoho from Superleap, or pending).
export const getCcStatus = (token, filters) => get(token, '/rechecks/cc-status', filters)

// Dashboards. periodIn = today|thisWeek|lastWeek|thisMonth|lastMonth.
export const getTeamDashboard = (token, filters) => get(token, '/dashboard/auditor-team', filters)
export const getBdaDashboard = (token, filters) => get(token, '/dashboard/bda', filters)

// Notifications (the alert section)
export const getNotifications = (token, unreadOnly) =>
  get(token, '/notifications', { unread: unreadOnly })
export const readNotification = (token, notificationId) =>
  post(token, `/notifications/${encodeURIComponent(notificationId)}/read`)
export const readAllNotifications = (token) => post(token, '/notifications/read-all')

// Auditor TL operations: pull the Zoho sync window now, or import the text of a Zoho response
// JSON file. Either way, new leads are then assigned by region.
export const importZoho = (token, zohoJsonText = '') =>
  request(token, 'post', '/zoho/import', { body: zohoJsonText })
