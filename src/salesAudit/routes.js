import { createElement, lazy } from 'react'
import RoleGate from './components/common/RoleGate'
import { ROUTE_PATTERNS } from './utils/routePaths'
import { ALL_ROLES, AUDIT_TEAM, SALES_TEAM, TL_ONLY } from './utils/roles'

const VIEW_PERMISSION = 'salesAudit.view'

// Each page is lazy and wrapped in RoleGate, which loads the signed-in member (GET /me) and
// enforces `roles`, so this works in Zen's shell (which only checks `permission`) too.
function gated(load, roles) {
  const Page = lazy(load)
  return function GatedPage() {
    return createElement(RoleGate, { roles }, createElement(Page))
  }
}

const page = (path, load, roles) => ({
  path,
  component: gated(load, roles),
  permission: VIEW_PERMISSION,
  roles,
})

const routes = [
  page(ROUTE_PATTERNS.myLeads, () => import('./pages/MyLeads'), AUDIT_TEAM),
  page(ROUTE_PATTERNS.leads, () => import('./pages/Leads'), ALL_ROLES),
  page(ROUTE_PATTERNS.leadAudit, () => import('./pages/LeadAudit'), AUDIT_TEAM),
  page(ROUTE_PATTERNS.ccVerification, () => import('./pages/CcVerification'), AUDIT_TEAM),
  page(ROUTE_PATTERNS.lead, () => import('./pages/LeadDetail'), ALL_ROLES),
  page(ROUTE_PATTERNS.rechecks, () => import('./pages/Rechecks'), ALL_ROLES),
  page(ROUTE_PATTERNS.teamDashboard, () => import('./pages/TeamDashboard'), TL_ONLY),
  page(ROUTE_PATTERNS.bdaDashboard, () => import('./pages/BdaDashboard'), SALES_TEAM),
  page(ROUTE_PATTERNS.alerts, () => import('./pages/Alerts'), ALL_ROLES),
  page(ROUTE_PATTERNS.members, () => import('./pages/Members'), TL_ONLY),
]

export default routes
