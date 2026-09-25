import salesAuditIcon from './assets/sales-audit.svg'
import rechecksIcon from './assets/rechecks.svg'
import bdaIcon from './assets/bda.svg'
import overviewIcon from './assets/overview.svg'
import { paths } from './utils/routePaths'
import { ALL_ROLES, AUDIT_TEAM, SALES_TEAM, TL_ONLY } from './utils/roles'

// `roles` narrows each item to the roles that use it (the shell also checks `key` permission).
const navItems = [
  {
    label: 'Team',
    route: paths.teamDashboard,
    key: 'salesAudit',
    image: overviewIcon,
    roles: TL_ONLY,
  },
  {
    label: 'Dashboard',
    route: paths.bdaDashboard,
    key: 'salesAudit',
    image: bdaIcon,
    roles: SALES_TEAM,
  },
  {
    label: 'My Leads',
    route: paths.myLeads,
    key: 'salesAudit',
    image: salesAuditIcon,
    roles: AUDIT_TEAM,
  },
  {
    label: 'All Leads',
    route: paths.leads,
    key: 'salesAudit',
    image: salesAuditIcon,
    roles: AUDIT_TEAM,
  },
  {
    label: 'Leads',
    route: paths.leads,
    key: 'salesAudit',
    image: salesAuditIcon,
    roles: SALES_TEAM,
  },
  {
    label: 'Rechecks',
    route: paths.rechecks(),
    key: 'salesAudit',
    image: rechecksIcon,
    roles: AUDIT_TEAM,
  },
  {
    label: 'Tickets',
    route: paths.rechecks(),
    key: 'salesAudit',
    image: rechecksIcon,
    roles: SALES_TEAM,
  },
  {
    label: 'Alerts',
    route: paths.alerts,
    key: 'salesAudit',
    image: rechecksIcon,
    roles: ALL_ROLES,
  },
  { label: 'Members', route: paths.members, key: 'salesAudit', image: bdaIcon, roles: TL_ONLY },
]

export default navItems
