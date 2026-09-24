import { Box, Chip, Link } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import DataTable from '../common/DataTable'
import MailAlertStatus from '../common/MailAlertStatus'
import { ALERT_SOURCES } from '../../utils/bdaMetrics'
import { paths } from '../../utils/routePaths'

// Who raised it: the auditor, the scheduler, or someone pressing "send now".
function getRaisedBy(alert) {
  if (alert.source === 'recheck') return 'Auditor'
  return alert.mail.trigger === 'manual' ? 'Manual' : 'Automated'
}

const COLUMNS = [
  {
    label: 'Alert',
    render: (alert) => (
      <Chip label={ALERT_SOURCES[alert.source].label} size="small" variant="outlined" />
    ),
  },
  { label: 'Raised By', render: getRaisedBy },
  {
    label: 'Student Name',
    render: (alert) => (
      <Link
        component={RouterLink}
        to={paths.student(alert.lead.id)}
        underline="hover"
        sx={{ fontWeight: 600 }}
      >
        {alert.lead.studentFullName}
      </Link>
    ),
  },
  {
    label: 'Details',
    render: (alert) => (
      <Box sx={{ minWidth: 280, maxWidth: 440, whiteSpace: 'normal' }}>{alert.detail}</Box>
    ),
  },
  { label: 'Mailed', render: (alert) => <MailAlertStatus mail={alert.mail} label="Sent" /> },
  {
    label: 'Status',
    render: (alert) =>
      alert.actionNeeded ? (
        <Chip label="Action needed" size="small" color="warning" />
      ) : (
        <Chip label="Cleared" size="small" color="success" variant="outlined" />
      ),
  },
]

function AlertsTable({ alerts }) {
  return <DataTable columns={COLUMNS} rows={alerts} />
}

export default AlertsTable
