import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { MarkEmailReadOutlined as MarkEmailReadOutlinedIcon } from '@mui/icons-material'
import { formatDateTime } from '../../utils/formatters'

function MailTooltip({ mail }) {
  return (
    <Box>
      {mail.subject && (
        <Typography variant="caption" component="div" sx={{ fontWeight: 600 }}>
          {mail.subject}
        </Typography>
      )}
      <Typography variant="caption" component="div" sx={{ opacity: 0.8 }}>
        {mail.trigger === 'manual' ? 'Sent manually' : 'Sent automatically'}
      </Typography>
      {mail.to.map((email) => (
        <Typography key={email} variant="caption" component="div">
          {email}
        </Typography>
      ))}
    </Box>
  )
}

// "<label> · 23-Sep-2026 10:15" for a sent alert mail; hover lists subject and recipients.
function MailAlertStatus({ mail, label }) {
  return (
    <Tooltip title={<MailTooltip mail={mail} />} arrow>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: 'success.main' }}>
        <MarkEmailReadOutlinedIcon sx={{ fontSize: 18 }} />
        <Typography variant="body2" sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
          {label} · {formatDateTime(mail.sentAt)}
        </Typography>
      </Stack>
    </Tooltip>
  )
}

export default MailAlertStatus
