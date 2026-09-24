import { CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { SendRounded as SendRoundedIcon } from '@mui/icons-material'
import MailAlertStatus from '../common/MailAlertStatus'
import { getMsUntilEscalation, needsEscalation } from '../../utils/leadStatus'
import { EMPTY_VALUE, formatDuration } from '../../utils/formatters'
import { MUTED_TEXT } from '../../styles/tableSx'

function EscalationStatus({ lead, now }) {
  if (lead.escalation) {
    return <MailAlertStatus mail={lead.escalation} label="Mailed BDA & Accounts" />
  }

  if (needsEscalation(lead)) {
    return (
      <Typography variant="body2" sx={{ fontSize: 13, color: 'warning.dark' }}>
        Auto-mail in {formatDuration(getMsUntilEscalation(lead, now))}
      </Typography>
    )
  }

  return <Typography sx={{ fontSize: 13, color: MUTED_TEXT }}>{EMPTY_VALUE}</Typography>
}

// Mail status for a pending lead, plus a manual "send now" for users with edit rights.
function EscalationCell({ lead, now, canSend, sending, onSend }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <EscalationStatus lead={lead} now={now} />
      {canSend && needsEscalation(lead) && (
        <Tooltip title="Mail BDA & Accounts now">
          <span>
            <IconButton
              size="small"
              color="primary"
              disabled={sending}
              onClick={() => onSend(lead.id)}
              aria-label="Mail BDA and Accounts now"
            >
              {sending ? <CircularProgress size={16} /> : <SendRoundedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Stack>
  )
}

export default EscalationCell
