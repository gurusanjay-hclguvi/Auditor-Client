import { Box, Chip, Grid, Link, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import DataTable from '../common/DataTable'
import { RESPONSE_TARGET_HOURS } from '../../utils/auditHistory'
import { EMPTY_VALUE, formatDuration, formatPercent } from '../../utils/formatters'
import { paths } from '../../utils/routePaths'
import { MUTED_TEXT } from '../../styles/tableSx'

const TARGET_S = RESPONSE_TARGET_HOURS * 60 * 60
const formatSeconds = (seconds) => (seconds == null ? EMPTY_VALUE : formatDuration(seconds * 1000))

function MedianCell({ metric }) {
  const { medianS } = metric.current
  if (medianS == null) return EMPTY_VALUE
  const overTarget = medianS > TARGET_S
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
        {formatSeconds(medianS)}
      </Typography>
      <Chip
        label={overTarget ? 'Over target' : 'On target'}
        size="small"
        color={overTarget ? 'error' : 'success'}
        variant="outlined"
      />
    </Stack>
  )
}

// Change in the median vs the previous period; shorter is better.
function MedianChange({ metric, periodLabel }) {
  const now = metric.current.medianS
  const before = metric.previous.medianS
  if (now == null || before == null) return EMPTY_VALUE
  const diff = now - before
  if (Math.abs(diff) < 60 * 60) return `About the same as ${periodLabel}`
  return `${formatSeconds(Math.abs(diff))} ${diff < 0 ? 'faster' : 'slower'} than ${periodLabel}`
}

const openItemLink = (metric, item) =>
  metric.key === 'paymentVerification'
    ? paths.studentPayments(item.lead.id)
    : paths.student(item.lead.id)

function getColumns(periodLabel) {
  return [
    { label: 'Measure', render: (metric) => <Box sx={{ fontWeight: 600 }}>{metric.label}</Box> },
    { label: 'Timed from', render: (metric) => metric.from },
    { label: 'Median', render: (metric) => <MedianCell metric={metric} /> },
    {
      label: `Within ${RESPONSE_TARGET_HOURS}h`,
      render: (metric) =>
        metric.current.count
          ? `${formatPercent(metric.current.withinTarget)} of ${metric.current.count}`
          : EMPTY_VALUE,
    },
    {
      label: 'Change',
      render: (metric) => <MedianChange metric={metric} periodLabel={periodLabel} />,
    },
    { label: 'Still open', render: (metric) => metric.slowestOpen.length || EMPTY_VALUE },
  ]
}

// Turnaround per measure against the target, plus the oldest items still waiting.
function ResponseTimesTable({ metrics, periodLabel }) {
  return (
    <Stack spacing={2}>
      <DataTable
        columns={getColumns(periodLabel)}
        rows={metrics.map((metric) => ({ ...metric, id: metric.key }))}
      />
      <Grid container spacing={2}>
        {metrics.map((metric) => (
          <Grid item xs={12} md={4} key={metric.key}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Oldest open · {metric.label}
              </Typography>
              {metric.slowestOpen.length === 0 ? (
                <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
                  Nothing waiting.
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {metric.slowestOpen.map((item) => (
                    <Stack key={item.id} direction="row" justifyContent="space-between" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Link
                          component={RouterLink}
                          to={openItemLink(metric, item)}
                          underline="hover"
                          sx={{ fontSize: 13, fontWeight: 600 }}
                        >
                          {item.lead.studentFullName}
                        </Link>
                        <Typography variant="caption" component="div" sx={{ color: MUTED_TEXT }}>
                          {item.label}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                          fontWeight: item.ageS > TARGET_S ? 700 : 400,
                          color: item.ageS > TARGET_S ? 'error.main' : 'text.primary',
                        }}
                      >
                        {formatSeconds(item.ageS)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

export default ResponseTimesTable
