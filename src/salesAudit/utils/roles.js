import { createContext, useContext } from 'react'
import { getCurrentUser } from '../apiCalls/salesAuditApi'
import { paths } from './routePaths'
import { isManagedBy, isOwnedBy } from './bdaMetrics'

// Who is using Sales Audit. The auditor works the audit pages; BDAs and BDMs only see the BDA
// View (a BDA their own leads, a BDM the leads of the BDAs under them) and the student pages it
// links to.
export const ROLES = {
  auditor: 'auditor',
  bdm: 'bdm',
  bda: 'bda',
}

export const ROLE_LABELS = {
  auditor: 'Auditor',
  bdm: 'BDM',
  bda: 'BDA',
}

export const AUDITOR_ONLY = [ROLES.auditor]
export const SALES_TEAM_ONLY = [ROLES.bdm, ROLES.bda]
export const ALL_ROLES = Object.values(ROLES)

// The signed-in user comes from the API (GET /me), keyed by the token in Redux; nothing about the
// user is stored in the client. Loaded once per token and shared by every page.
const usersByToken = new Map()

export function loadCurrentUser(token) {
  if (!usersByToken.has(token)) {
    const request = getCurrentUser(token).catch((error) => {
      usersByToken.delete(token)
      throw error
    })
    usersByToken.set(token, request)
  }
  return usersByToken.get(token)
}

// Provided by RoleGate around every Sales Audit page: { hash, name, email, role }.
export const CurrentUserContext = createContext(null)

export function useCurrentUser() {
  return useContext(CurrentUserContext)
}

// Where each role starts: the auditor's My Leads, the sales team's BDA View.
export const getRoleHome = (role) => (role === ROLES.auditor ? paths.myLeads() : paths.bda)

export function canUseRoute(user, roles) {
  return Boolean(user) && (!roles || roles.includes(user.role))
}

// The auditor sees every lead; a BDA only their own; a BDM only their team's.
export function canSeeLead(user, lead) {
  if (user.role === ROLES.bda) return isOwnedBy(lead, user.email)
  if (user.role === ROLES.bdm) return isManagedBy(lead, user.email)
  return true
}

// For page fetchers: fails the load when the lead is outside the user's scope.
export function checkLeadAccess(user, lead) {
  if (lead && !canSeeLead(user, lead)) {
    throw new Error("This lead isn't one of yours, so you can't open it.")
  }
  return lead
}

// Where "back" goes from the student pages: the auditor's Leads, or the sales team's BDA View.
export function getHomeLink(role) {
  return role === ROLES.auditor
    ? { to: paths.leads(), label: 'Leads' }
    : { to: paths.bda, label: 'BDA View' }
}
