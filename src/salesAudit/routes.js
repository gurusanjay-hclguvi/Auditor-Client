import { lazy } from 'react'
import { ROUTE_PATTERNS } from './utils/routePaths'

const VIEW_PERMISSION = 'salesAudit.view'

const routes = [
  {
    path: ROUTE_PATTERNS.leads,
    component: lazy(() => import('./pages/Leads')),
    permission: VIEW_PERMISSION,
  },
  {
    path: ROUTE_PATTERNS.leadAudit,
    component: lazy(() => import('./pages/LeadAudit')),
    permission: VIEW_PERMISSION,
  },
  {
    path: ROUTE_PATTERNS.rechecks,
    component: lazy(() => import('./pages/Rechecks')),
    permission: VIEW_PERMISSION,
  },
  {
    path: ROUTE_PATTERNS.bda,
    component: lazy(() => import('./pages/BdaView')),
    permission: VIEW_PERMISSION,
  },
  {
    path: ROUTE_PATTERNS.overview,
    component: lazy(() => import('./pages/AuditOverview')),
    permission: VIEW_PERMISSION,
  },
  {
    path: ROUTE_PATTERNS.student,
    component: lazy(() => import('./pages/StudentDetail')),
    permission: VIEW_PERMISSION,
  },
  {
    path: ROUTE_PATTERNS.studentPayments,
    component: lazy(() => import('./pages/StudentPayments')),
    permission: VIEW_PERMISSION,
  },
  {
    path: ROUTE_PATTERNS.ccVerification,
    component: lazy(() => import('./pages/CcVerification')),
    permission: VIEW_PERMISSION,
  },
]

export default routes
