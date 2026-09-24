import salesAuditIcon from './assets/sales-audit.svg'
import rechecksIcon from './assets/rechecks.svg'
import bdaIcon from './assets/bda.svg'
import overviewIcon from './assets/overview.svg'
import { paths } from './utils/routePaths'

const navItems = [
  {
    label: 'Leads',
    route: paths.leads(),
    key: 'salesAudit',
    image: salesAuditIcon,
  },
  {
    label: 'Audit Overview',
    route: paths.overview,
    key: 'salesAudit',
    image: overviewIcon,
  },
  {
    label: 'Rechecks',
    route: paths.rechecks(),
    key: 'salesAudit',
    image: rechecksIcon,
  },
  {
    label: 'BDA View',
    route: paths.bda,
    key: 'salesAudit',
    image: bdaIcon,
  },
]

export default navItems
