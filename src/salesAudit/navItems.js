import salesAuditIcon from './assets/sales-audit.svg'
import rechecksIcon from './assets/rechecks.svg'
import bdaIcon from './assets/bda.svg'
import overviewIcon from './assets/overview.svg'
import { paths } from './utils/routePaths'
import { ALL_ROLES, AUDITOR_ONLY, SALES_TEAM_ONLY } from './utils/roles'

const navItems = [
  {
    label: 'My Leads',
    route: paths.myLeads(),
    key: 'salesAudit',
    image: salesAuditIcon,
    roles: AUDITOR_ONLY,
  },
  {
    label: 'All Leads',
    route: paths.leads(),
    key: 'salesAudit',
    image: salesAuditIcon,
    roles: AUDITOR_ONLY,
  },
  {
    label: 'Audit Overview',
    route: paths.overview,
    key: 'salesAudit',
    image: overviewIcon,
    roles: AUDITOR_ONLY,
  },
  {
    label: 'BDA View',
    route: paths.bda,
    key: 'salesAudit',
    image: bdaIcon,
    roles: SALES_TEAM_ONLY,
  },
  {
    label: 'Rechecks',
    route: paths.rechecks(),
    key: 'salesAudit',
    image: rechecksIcon,
    roles: ALL_ROLES,
  },
]

export default navItems
