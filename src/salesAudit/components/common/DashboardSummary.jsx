import { useCallback, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AutoAwesomeRounded as SummaryIcon,
  RefreshRounded as RefreshIcon,
} from '@mui/icons-material'
import { MUTED_TEXT } from '../../styles/tableSx'
import { formatDateTime } from '../../utils/formatters'
import { useApi } from '../../utils/useApi'

// One-paragraph summary of the dashboard, written by the backend's LLM from the same figures.
// `api` is the summary call and `filters` the dashboard's filters; it loads on its own, so the
// dashboard never waits for it. Refresh asks for a new one even when the figures are unchanged.
function DashboardSummary({ api, filters }) {
  const key = JSON.stringify(filters)
  // A refresh only counts for the filters it was pressed on.
  const [refresh, setRefresh] = useState({ key: '', count: 0 })
  const count = refresh.key === key ? refresh.count : 0
  const { data, loading, error, reload } = useApi(
    useCallback(
      (token) => api(token, { ...JSON.parse(key), refresh: count > 0 ? 'true' : '' }),
      [api, key, count],
    ),
  )

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderColor: 'primary.light', bgcolor: '#F5F9FF' }}
      aria-busy={loading}
    >
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
        <SummaryIcon fontSize="small" color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
          Summary
        </Typography>
        <Tooltip title="Write a new summary">
          <span>
            <IconButton
              size="small"
              aria-label="Write a new summary"
              disabled={loading}
              onClick={() => setRefresh({ key, count: count + 1 })}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {loading ? (
        <Box>
          <Skeleton width="100%" />
          <Skeleton width="95%" />
          <Skeleton width="70%" />
        </Box>
      ) : error ? (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={reload}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : (
        <>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {data.summary}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: MUTED_TEXT }}>
            Written by AI ({data.model}) from the figures on this page ·{' '}
            {formatDateTime(data.generatedAt)}. Check the numbers below before acting on it.
          </Typography>
        </>
      )}
    </Paper>
  )
}

export default DashboardSummary
