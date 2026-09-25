import { useCallback } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import { getNotifications, readAllNotifications, readNotification } from '../apiCalls/salesAuditApi'
import { formatDateTime } from '../utils/formatters'
import { paths } from '../utils/routePaths'
import { useCanWrite } from '../utils/roles'
import { useAction } from '../utils/useAction'
import { useApi } from '../utils/useApi'

const TYPE_LABELS = {
  leadsAssigned: 'Assigned',
  leadReassigned: 'Reassigned',
  recheckRaised: 'Recheck raised',
  recheckClosed: 'Recheck closed',
  ccUpdated: 'CC updated',
  ccTicketOpen: 'Close ticket',
}

// The alert section: rechecks raised on your leads, rechecks closed, leads assigned to you, CCs
// that arrived. Opening one marks it read.
function Alerts() {
  const navigate = useNavigate()
  const canWrite = useCanWrite()
  const [params, setParams] = useSearchParams()
  const unreadOnly = params.get('show') === 'unread'
  const { data, loading, error, reload } = useApi(
    useCallback((token) => getNotifications(token, unreadOnly), [unreadOnly]),
  )
  const markOne = useAction(readNotification)
  const markAll = useAction(readAllNotifications)

  async function open(notification) {
    if (canWrite && !notification.read) await markOne.run(notification.id)
    if (notification.leadId) navigate(paths.lead(notification.leadId))
    else reload()
  }

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle={data ? `${data.unread} unread` : undefined}
        action={
          <Stack direction="row" gap={1.5}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={unreadOnly ? 'unread' : 'all'}
              onChange={(_, value) =>
                value && setParams(value === 'unread' ? { show: 'unread' } : {})
              }
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="unread">Unread</ToggleButton>
            </ToggleButtonGroup>
            {canWrite && (
              <Button
                variant="outlined"
                disabled={!data?.unread || markAll.busy}
                onClick={async () => (await markAll.run()) && reload()}
              >
                Mark all read
              </Button>
            )}
          </Stack>
        }
      />
      {(markOne.error || markAll.error) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {markOne.error || markAll.error}
        </Alert>
      )}
      <PageState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={data?.items.length === 0}
        emptyMessage="No alerts."
      >
        {data && (
          <Paper variant="outlined">
            <List disablePadding>
              {data.items.map((notification) => (
                <ListItemButton
                  key={notification.id}
                  divider
                  onClick={() => open(notification)}
                  sx={{ bgcolor: notification.read ? undefined : '#EEF5FF' }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" gap={1} alignItems="center">
                        <Chip
                          size="small"
                          color={notification.type === 'ccTicketOpen' ? 'error' : 'default'}
                          label={TYPE_LABELS[notification.type] ?? notification.type}
                        />
                        <Box component="span" sx={{ fontWeight: notification.read ? 400 : 700 }}>
                          {notification.title}
                        </Box>
                      </Stack>
                    }
                    secondary={`${notification.message} · ${formatDateTime(notification.created.at)}`}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}
      </PageState>
    </>
  )
}

export default Alerts
