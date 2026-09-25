import { Box, Stack, Typography } from '@mui/material'
import { MUTED_TEXT } from '../../styles/tableSx'
import { ASSIGN_MODE_LABELS, EVENT_LABELS, categoryLabel } from '../../utils/labels'
import { formatDateTime } from '../../utils/formatters'

const EVENT_COLORS = {
  leadImported: '#5E7087',
  assigned: '#0d75fc',
  reassigned: '#0d75fc',
  takenUp: '#0d75fc',
  ccUpdated: '#0d75fc',
  recheckRaised: '#ed6c02',
  recheckClosed: '#9c27b0',
  auditCompleted: '#2e7d32',
}

// What happened, in one line, from the event's data.
function describe(event) {
  const data = event.data ?? {}
  switch (event.type) {
    case 'assigned':
      return `To ${data.auditorEmail} (${ASSIGN_MODE_LABELS[data.mode] ?? data.mode})`
    case 'reassigned':
    case 'takenUp':
      return `From ${data.from || 'no one'} to ${data.auditorEmail}`
    case 'recheckRaised':
      // With several reasons, comments already names each one's category.
      return data.reasons?.length > 1
        ? `${data.recheckNo} · ${data.comments}`
        : `${data.recheckNo} · ${categoryLabel(data.category)}: ${data.comments ?? ''}`
    case 'recheckClosed':
      return `${data.recheckNo} · ${data.note ?? ''}`
    case 'auditCompleted':
      return `Attempt ${data.attempt}${data.comments ? `: ${data.comments}` : ''}`
    case 'leadImported':
      return [data.region, data.stage].filter(Boolean).join(' · ')
    default:
      return ''
  }
}

// The lead's history: lead in → audit → recheck → closed → audit again → completed, with who and
// when for each step.
function LeadTimeline({ events }) {
  if (!events.length) {
    return (
      <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
        Nothing has happened on this lead yet.
      </Typography>
    )
  }
  return (
    <Stack>
      {events.map((event, index) => (
        <Stack key={event.id} direction="row" gap={1.5}>
          <Stack alignItems="center">
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                mt: 0.75,
                bgcolor: EVENT_COLORS[event.type] ?? MUTED_TEXT,
              }}
            />
            {index < events.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: 'divider' }} />}
          </Stack>
          <Box sx={{ pb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {EVENT_LABELS[event.type] ?? event.type}
            </Typography>
            {describe(event) && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {describe(event)}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
              {formatDateTime(event.at)} · {event.actor?.name || event.actor?.email}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}

export default LeadTimeline
