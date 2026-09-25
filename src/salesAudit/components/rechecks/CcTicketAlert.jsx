import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { ReportRounded as ReportIcon } from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import { formatDateTime, formatElapsed } from '../../utils/formatters'
import { ccUpdatedNotClosed } from '../../utils/labels'
import { paths } from '../../utils/routePaths'
import { useNow } from '../../utils/useNow'

// Red chip for a ticket in that state, with the time since the CC update.
export function CcUpdatedChip({ recheck }) {
  const now = useNow()
  if (!ccUpdatedNotClosed(recheck)) return null
  return (
    <Tooltip
      title={`The CC was updated ${formatDateTime(recheck.ccUpdatedAt)} but this ticket is still open. Close it so the lead can be audited again.`}
    >
      <Chip
        size="small"
        color="error"
        icon={<ReportIcon />}
        label={`CC updated ${formatElapsed(now - recheck.ccUpdatedAt)} ago · close ticket`}
      />
    </Tooltip>
  )
}

// The red alert at the top of the BDA / BDM dashboard: every such ticket, oldest CC update first,
// with the time since it and a Close ticket button.
export function CcTicketAlert({ rechecks, bdm, onClose }) {
  const now = useNow()
  if (!rechecks?.length) return null
  const sorted = [...rechecks].sort((a, b) => a.ccUpdatedAt - b.ccUpdatedAt)
  const count = rechecks.length === 1 ? '1 ticket' : `${rechecks.length} tickets`
  return (
    <Alert
      severity="error"
      variant="filled"
      icon={<ReportIcon />}
      sx={{ '& .MuiAlert-message': { width: '100%' } }}
    >
      <AlertTitle sx={{ fontWeight: 700 }}>
        {bdm ? `Your team has ${count} to close now` : `You have ${count} to close now`}
      </AlertTitle>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        The CC was updated but the recheck ticket is still open. The auditor can only audit the lead
        again once the ticket is closed, so closing it is very important.
      </Typography>
      <Stack gap={1}>
        {sorted.map((recheck) => (
          <Stack
            key={recheck.id}
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
            gap={1.5}
            sx={{ bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 1, px: 1.5, py: 1 }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {recheck.recheckNo} ·{' '}
                <Link
                  component={RouterLink}
                  to={paths.lead(recheck.leadId)}
                  color="inherit"
                  underline="always"
                >
                  {recheck.leadName || recheck.zenId}
                </Link>
                {bdm && ` · ${recheck.bdaEmail}`}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                CC updated {formatDateTime(recheck.ccUpdatedAt)} · raised{' '}
                {formatDateTime(recheck.raisedAt)}
              </Typography>
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
              {formatElapsed(now - recheck.ccUpdatedAt)} since CC update
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              onClick={() => onClose(recheck)}
              sx={{ color: 'error.main', bgcolor: 'common.white', whiteSpace: 'nowrap' }}
            >
              Close ticket
            </Button>
          </Stack>
        ))}
      </Stack>
    </Alert>
  )
}
