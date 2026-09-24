import { lazy } from 'react'
import { ROUTE_PATTERNS } from './utils/routePaths'
import { ALL_ROLES, AUDITOR_ONLY, SALES_TEAM_ONLY } from './utils/roles'

const VIEW_PERMISSION = 'salesAudit.view'

// `roles`: who may open the page. The audit pages are the auditor's; the BDA View is the BDAs'
// and BDMs'; the student pages it links to are open to everyone.
const routes = [
  // First auditor route = where an auditor lands after login.
  {
    path: ROUTE_PATTERNS.myLeads,
    component: lazy(() => import('./pages/MyLeads')),
    permission: VIEW_PERMISSION,
    roles: AUDITOR_ONLY,
  },
  {
    path: ROUTE_PATTERNS.leads,
    component: lazy(() => import('./pages/Leads')),
    permission: VIEW_PERMISSION,
    roles: AUDITOR_ONLY,
  },
  {
    path: ROUTE_PATTERNS.leadAudit,
    component: lazy(() => import('./pages/LeadAudit')),
    permission: VIEW_PERMISSION,
    roles: AUDITOR_ONLY,
  },
  {
    path: ROUTE_PATTERNS.rechecks,
    component: lazy(() => import('./pages/Rechecks')),
    permission: VIEW_PERMISSION,
    roles: AUDITOR_ONLY,
  },
  {
    path: ROUTE_PATTERNS.bda,
    component: lazy(() => import('./pages/BdaView')),
    permission: VIEW_PERMISSION,
    roles: SALES_TEAM_ONLY,
  },
  {
    path: ROUTE_PATTERNS.overview,
    component: lazy(() => import('./pages/AuditOverview')),
    permission: VIEW_PERMISSION,
    roles: AUDITOR_ONLY,
  },
  {
    path: ROUTE_PATTERNS.student,
    component: lazy(() => import('./pages/StudentDetail')),
    permission: VIEW_PERMISSION,
    roles: ALL_ROLES,
  },
  {
    path: ROUTE_PATTERNS.studentPayments,
    component: lazy(() => import('./pages/StudentPayments')),
    permission: VIEW_PERMISSION,
    roles: ALL_ROLES,
  },
  {
    path: ROUTE_PATTERNS.ccVerification,
    component: lazy(() => import('./pages/CcVerification')),
    permission: VIEW_PERMISSION,
    roles: ALL_ROLES,
  },
]

export default routes
