import { Button, Link, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import DataTable from '../common/DataTable'
import { RecheckStatusChip } from '../common/Chips'
import { ReasonChips } from './RecheckReasons'
import { CcUpdatedChip } from './CcTicketAlert'
import { MUTED_TEXT } from '../../styles/tableSx'
import { formatDateTime } from '../../utils/formatters'
import { paths } from '../../utils/routePaths'
import { isAuditRole, useCanWrite, useCurrentUser } from '../../utils/roles'

// Who may close: the lead's BDA, a BDM (the backend checks it is their team), any auditor.
function canClose(user, recheck) {
  if (recheck.status !== 'open') return false
  if (isAuditRole(user.role) || user.role === 'bdm') return true
  return user.role === 'bda' && recheck.bdaEmail === user.email
}

// Recheck tickets. Auditors get "Audit again" on closed tickets whose lead waits for a new audit.
function RechecksTable({ rechecks, onClose }) {
  const user = useCurrentUser()
  const canWrite = useCanWrite()
  const columns = [
    {
      label: 'Recheck ID',
      render: (recheck) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {recheck.recheckNo}
        </Typography>
      ),
    },
    {
      label: 'Lead',
      render: (recheck) => (
        <Link component={RouterLink} to={paths.lead(recheck.leadId)} underline="hover">
          {recheck.leadName || recheck.zenId}
        </Link>
      ),
    },
    { label: 'Reasons', render: (recheck) => <ReasonChips recheck={recheck} /> },
    {
      label: 'Comments',
      render: (recheck) => (
        <Typography variant="body2" sx={{ whiteSpace: 'normal', maxWidth: 320 }}>
          {recheck.comments}
        </Typography>
      ),
    },
    {
      label: 'Raised',
      render: (recheck) => (
        <Stack>
          <span>{formatDateTime(recheck.raisedAt)}</span>
          <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
            {recheck.raisedBy?.name || recheck.raisedBy?.email}
          </Typography>
        </Stack>
      ),
    },
    { label: 'BDA', render: (recheck) => recheck.bdaEmail },
    {
      label: 'Status',
      render: (recheck) => (
        <Stack alignItems="flex-start" gap={0.5}>
          <RecheckStatusChip recheck={recheck} />
          <CcUpdatedChip recheck={recheck} />
        </Stack>
      ),
    },
    {
      label: 'Closed',
      render: (recheck) =>
        recheck.closed ? (
          <Stack sx={{ maxWidth: 260 }}>
            <span>{formatDateTime(recheck.closed.at)}</span>
            <Typography variant="caption" sx={{ color: MUTED_TEXT, whiteSpace: 'normal' }}>
              by {recheck.closed.by?.name || recheck.closed.by?.email}
              {recheck.closed.by?.role ? ` (${recheck.closed.by.role})` : ''}: {recheck.closed.note}
            </Typography>
          </Stack>
        ) : (
          '—'
        ),
    },
    {
      label: 'Actions',
      render: (recheck) => (
        <Stack direction="row" gap={1}>
          {canWrite && canClose(user, recheck) && (
            <Button size="small" variant="outlined" onClick={() => onClose(recheck)}>
              Close ticket
            </Button>
          )}
          {isAuditRole(user.role) && recheck.status === 'closed' && !recheck.reauditedAt && (
            <Button
              size="small"
              variant="contained"
              component={RouterLink}
              to={paths.leadAudit(recheck.leadId)}
            >
              Audit again
            </Button>
          )}
        </Stack>
      ),
    },
  ]
  return <DataTable columns={columns} rows={rechecks} storageKey="rechecks" />
}

export default RechecksTable
