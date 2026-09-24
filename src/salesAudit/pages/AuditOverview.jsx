import { useMemo, useState } from 'react'
import { Box, Grid, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import TrendTile from '../components/overview/TrendTile'
import PatternList from '../components/overview/PatternList'
import ResponseTimesTable from '../components/overview/ResponseTimesTable'
import BdaSummaryTable from '../components/overview/BdaSummaryTable'
import { getAuditHistory, getLeads } from '../apiCalls/salesAuditApi'
import { useApi } from '../utils/useApi'
import {
  computeResponseTimes,
  computeTrends,
  findRepeatPatterns,
  getPeriods,
  summarizeByBda,
} from '../utils/auditHistory'
import { paths } from '../utils/routePaths'

const PERIOD_OPTIONS = [7, 30]

// Where each trend's records live.
const TREND_LINKS = {
  rechecksRaised: { to: `${paths.rechecks()}?status=all`, label: 'View rechecks' },
  rechecksResolved: { to: `${paths.rechecks()}?status=resolved`, label: 'View resolved' },
  openRechecks: { to: `${paths.rechecks()}?status=open`, label: 'Work the backlog' },
  escalations: { to: paths.leads('pending'), label: 'View pending leads' },
  mismatches: { to: paths.leads('pending'), label: 'View pending leads' },
}

// Leads is called first so its escalation sweep lands in the history's mail log.
const fetchOverview = (token) => Promise.all([getLeads(token), getAuditHistory(token)])

function Section({ title, subtitle, children }) {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
  )
}

function AuditOverview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const days = PERIOD_OPTIONS.includes(Number(searchParams.get('days')))
    ? Number(searchParams.get('days'))
    : PERIOD_OPTIONS[0]
  const periodLabel = `previous ${days} days`

  const { data, loading, error, reload } = useApi(fetchOverview)
  const [now] = useState(() => Date.now())

  const view = useMemo(() => {
    if (!data) return null
    const [{ leads }, history] = data
    const periods = getPeriods(now, days)
    return {
      trends: computeTrends(history, periods),
      patterns: findRepeatPatterns(history, leads, periods),
      responseTimes: computeResponseTimes(history, leads, periods),
      byBda: summarizeByBda(history, leads, periods),
    }
  }, [data, days, now])

  return (
    <Box>
      <PageHeader
        title="Audit Overview"
        subtitle="What changed, what keeps repeating, and who needs a follow-up"
        action={
          <ToggleButtonGroup
            size="small"
            exclusive
            value={days}
            onChange={(_, next) => next && setSearchParams({ days: String(next) })}
          >
            {PERIOD_OPTIONS.map((option) => (
              <ToggleButton key={option} value={option} sx={{ px: 2 }}>
                Last {option} days
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        }
      />

      <PageState loading={loading} error={error} onRetry={reload}>
        {view && (
          <Stack spacing={4}>
            <Grid container spacing={2}>
              {Object.values(view.trends).map((trend) => (
                <Grid item xs={12} sm={6} md key={trend.key}>
                  <TrendTile
                    trend={trend}
                    periodLabel={periodLabel}
                    to={TREND_LINKS[trend.key].to}
                    linkLabel={TREND_LINKS[trend.key].label}
                  />
                </Grid>
              ))}
            </Grid>

            <Section
              title={`Patterns to act on (${view.patterns.length})`}
              subtitle={`Issues that repeated in the last ${days} days, with a suggested follow-up`}
            >
              <PatternList
                patterns={view.patterns}
                emptyMessage={`No repeat issues in the last ${days} days.`}
              />
            </Section>

            <Section
              title="Response times"
              subtitle={`How fast issues were cleared in the last ${days} days, and what is waiting`}
            >
              <ResponseTimesTable metrics={view.responseTimes} periodLabel={periodLabel} />
            </Section>

            <Section title="By BDA" subtitle="Most open issues first">
              <BdaSummaryTable rows={view.byBda} periodLabel={periodLabel} />
            </Section>
          </Stack>
        )}
      </PageState>
    </Box>
  )
}

export default AuditOverview
