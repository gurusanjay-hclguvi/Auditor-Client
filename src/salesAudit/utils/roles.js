import { createContext, useContext } from 'react'
import { useSelector } from 'react-redux'
import { getMe } from '../apiCalls/salesAuditApi'
import { paths } from './routePaths'

// Who uses Sales Audit. Auditors (and their TL) work the leads; BDAs and BDMs fix the rechecks
// raised on their leads. The role comes from the backend (GET /me), never from the client.
export const ROLES = {
  auditorTl: 'auditorTl',
  auditor: 'auditor',
  bdm: 'bdm',
  bda: 'bda',
}

export const ROLE_LABELS = {
  auditorTl: 'Auditor TL',
  auditor: 'Auditor',
  bdm: 'BDM',
  bda: 'BDA',
}

export const AUDIT_TEAM = [ROLES.auditorTl, ROLES.auditor]
export const TL_ONLY = [ROLES.auditorTl]
export const SALES_TEAM = [ROLES.bdm, ROLES.bda]
export const ALL_ROLES = Object.values(ROLES)

export const isAuditRole = (role) => AUDIT_TEAM.includes(role)

// The signed-in member, loaded once per token and shared by every page.
const usersByToken = new Map()

export function loadCurrentUser(token) {
  if (!usersByToken.has(token)) {
    const request = getMe(token).catch((error) => {
      usersByToken.delete(token)
      throw error
    })
    usersByToken.set(token, request)
  }
  return usersByToken.get(token)
}

// Provided by RoleGate around every page: the member plus `permissions` and `teamEmails`.
export const CurrentUserContext = createContext(null)

export function useCurrentUser() {
  return useContext(CurrentUserContext)
}

// Zen's write permission for the feature; every action button needs it.
export function useCanWrite() {
  return useSelector((state) => Boolean(state.reducers.commonData.permission.salesAudit?.write))
}

export function useToken() {
  return useSelector((state) => state.reducers.commonData.authToken)
}

// Where each role starts.
export function getRoleHome(role) {
  if (role === ROLES.auditorTl) return paths.teamDashboard
  if (isAuditRole(role)) return paths.myLeads
  return paths.bdaDashboard
}

export function canUseRoute(user, roles) {
  return Boolean(user) && (!roles || roles.includes(user.role))
}
