import { createElement, lazy } from 'react'
import RoleGate from './components/common/RoleGate'
import { ROUTE_PATTERNS } from './utils/routePaths'
import { ALL_ROLES, AUDITOR_ONLY, SALES_TEAM_ONLY } from './utils/roles'

const VIEW_PERMISSION = 'salesAudit.view'

// `roles`: who may open the page. The audit pages are the auditor's; the BDA View is the BDAs'
// and BDMs'; the student pages it links to are open to everyone. Each page is wrapped in RoleGate,
// which loads the signed-in user (GET /me) and enforces `roles`, so this works in Zen's shell
// (which only checks `permission`) as well as in the dev shell.
function gated(load, roles) {
  const Page = lazy(load)
  return function GatedPage() {
    return createElement(RoleGate, { roles }, createElement(Page))
  }
}
const routes = [
  // First auditor route = where an auditor lands after login.
  {
    path: ROUTE_PATTERNS.myLeads,
    component: gated(() => import('./pages/MyLeads'), AUDITOR_ONLY),
    permission: VIEW_PERMISSION,
    roles: AUDITOR_ONLY,
  },
  {
    path: ROUTE_PATTERNS.leads,
    component: gated(() => import('./pages/Leads'), AUDITOR_ONLY),
    permission: VIEW_PERMISSION,
    roles: AUDITOR_ONLY,
  },
  {
    path: ROUTE_PATTERNS.leadAudit,
    component: gated(() => import('./pages/LeadAudit'), AUDITOR_ONLY),
    permission: VIEW_PERMISSION,
    roles: AUDITOR_ONLY,
  },
  {
    path: ROUTE_PATTERNS.rechecks,
    component: gated(() => import('./pages/Rechecks'), AUDITOR_ONLY),
    permission: VIEW_PERMISSION,
    roles: AUDITOR_ONLY,
  },
  {
    path: ROUTE_PATTERNS.bda,
    component: gated(() => import('./pages/BdaView'), SALES_TEAM_ONLY),
    permission: VIEW_PERMISSION,
    roles: SALES_TEAM_ONLY,
  },
  {
    path: ROUTE_PATTERNS.overview,
    component: gated(() => import('./pages/AuditOverview'), AUDITOR_ONLY),
    permission: VIEW_PERMISSION,
    roles: AUDITOR_ONLY,
  },
  {
    path: ROUTE_PATTERNS.student,
    component: gated(() => import('./pages/StudentDetail'), ALL_ROLES),
    permission: VIEW_PERMISSION,
    roles: ALL_ROLES,
  },
  {
    path: ROUTE_PATTERNS.studentPayments,
    component: gated(() => import('./pages/StudentPayments'), ALL_ROLES),
    permission: VIEW_PERMISSION,
    roles: ALL_ROLES,
  },
  {
    path: ROUTE_PATTERNS.ccVerification,
    component: gated(() => import('./pages/CcVerification'), ALL_ROLES),
    permission: VIEW_PERMISSION,
    roles: ALL_ROLES,
  },
]

export default routes
