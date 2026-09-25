import { useCallback, useEffect, useState } from 'react'
import { Badge, IconButton, Tooltip } from '@mui/material'
import { NotificationsNoneRounded as BellIcon } from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import { getNotifications } from '../../apiCalls/salesAuditApi'
import { useApi } from '../../utils/useApi'
import { paths } from '../../utils/routePaths'

const REFRESH_MS = 60 * 1000

// Unread alert count for the app bar; opens the Alerts page. Polls once a minute.
function NotificationBell() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), REFRESH_MS)
    return () => clearInterval(timer)
  }, [])
  // tick is part of the fetcher so the count refreshes on each interval.
  const { data } = useApi(
    useCallback(
      (token) => getNotifications(token, true).then((list) => ({ ...list, tick })),
      [tick],
    ),
  )
  return (
    <Tooltip title="Alerts">
      <IconButton component={RouterLink} to={paths.alerts}>
        <Badge badgeContent={data?.unread ?? 0} color="error">
          <BellIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  )
}

export default NotificationBell
