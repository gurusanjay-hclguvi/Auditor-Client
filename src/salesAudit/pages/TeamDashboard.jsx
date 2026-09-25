import { useCallback } from 'react'
import { Chip, Link, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import DataTable from '../components/common/DataTable'
import StatTile from '../components/common/StatTile'
import { getTeamDashboard } from '../apiCalls/salesAuditApi'
import { MUTED_TEXT } from '../styles/tableSx'
import { DATE_PRESETS } from '../utils/labels'
import { formatDateTime } from '../utils/formatters'
import { paths } from '../utils/routePaths'
import { useApi } from '../utils/useApi'

// The auditor TL's view of the auditors under them: audits done, completed and rechecks raised in
// the period, what each still has open, and each day's work for one auditor.
function TeamDashboard() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const period = params.get('period') ?? 'thisMonth'
  const auditorEmail = params.get('auditor') ?? ''
  const { data, loading, error, reload } = useApi(
    useCallback(
      (token) => getTeamDashboard(token, { periodIn: period, auditorEmail }),
      [period, auditorEmail],
    ),
  )
  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }
  const selected = auditorEmail && data?.auditors.find((auditor) => auditor.email === auditorEmail)

  const columns = [
    {
      label: 'Auditor',
      render: (row) => (
        <Stack>
          <Link
            component="button"
            underline="hover"
            onClick={() => set('auditor', row.email)}
            sx={{ textAlign: 'left', fontWeight: 600 }}
          >
            {row.name}
          </Link>
          <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
            {row.email}
          </Typography>
        </Stack>
      ),
    },
    { label: 'Region', render: (row) => row.region || '—' },
    {
      label: 'Available',
      render: (row) => (
        <Chip
          size="small"
          label={row.available ? 'Available' : 'Away'}
          color={row.available ? 'success' : 'default'}
          variant="outlined"
        />
      ),
    },
    { label: 'Assigned', render: (row) => row.assigned },
    { label: 'Open', render: (row) => row.pending },
    { label: 'Audits done', render: (row) => row.auditsDone },
    { label: 'Completed', render: (row) => row.completed },
    { label: 'Rechecks raised', render: (row) => row.rechecksRaised },
    { label: 'Last audit', render: (row) => formatDateTime(row.lastAuditAt) },
  ]

  return (
    <>
      <PageHeader
        title="Audit team"
        subtitle="What each auditor under you has done, and when."
        action={
          <Stack direction="row" gap={1.5}>
            <TextField
              select
              size="small"
              label="Period"
              value={period}
              onChange={(event) => set('period', event.target.value)}
              sx={{ minWidth: 150 }}
            >
              {DATE_PRESETS.map((preset) => (
                <MenuItem key={preset.value} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Auditor"
              value={auditorEmail}
              onChange={(event) => set('auditor', event.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Everyone</MenuItem>
              {(data?.auditors ?? []).map((auditor) => (
                <MenuItem key={auditor.email} value={auditor.email}>
                  {auditor.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      />
      <PageState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={data?.auditors.length === 0}
        emptyMessage="No auditors yet. Add them under Members."
      >
        {data && (
          <Stack gap={3}>
            <Stack direction="row" gap={2} flexWrap="wrap">
              <StatTile
                label="Leads assigned"
                value={data.totals.assigned}
                onClick={() => navigate(paths.leads)}
              />
              <StatTile
                label="Still open"
                value={data.totals.pending}
                onClick={() => navigate(`${paths.leads}?auditStatus=pending`)}
              />
              <StatTile label="Audits done" value={data.totals.auditsDone} hint="in the period" />
              <StatTile
                label="Completed"
                value={data.totals.completed}
                color="success.main"
                hint="in the period"
                onClick={() => navigate(`${paths.leads}?tab=completed&completedIn=${period}`)}
              />
              <StatTile
                label="Rechecks raised"
                value={data.totals.rechecksRaised}
                color="warning.main"
                hint="in the period"
                onClick={() => navigate(paths.rechecks(`scope=all&raisedIn=${period}`))}
              />
            </Stack>
            <DataTable
              columns={columns}
              rows={data.auditors.map((auditor) => ({ ...auditor, id: auditor.email }))}
            />
            {selected && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  {selected.name}, day by day
                </Typography>
                <DataTable
                  columns={[
                    { label: 'Date', render: (day) => day.date },
                    { label: 'Audits done', render: (day) => day.auditsDone },
                    { label: 'Completed', render: (day) => day.completed },
                    { label: 'Rechecks raised', render: (day) => day.rechecksRaised },
                  ]}
                  rows={selected.daily.map((day) => ({ ...day, id: day.date }))}
                />
              </Paper>
            )}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Recent audits
              </Typography>
              {data.recent.length === 0 ? (
                <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
                  No audits in this period.
                </Typography>
              ) : (
                <DataTable
                  columns={[
                    { label: 'When', render: (audit) => formatDateTime(audit.submittedAt) },
                    {
                      label: 'Auditor',
                      render: (audit) => audit.auditor?.name || audit.auditor?.email,
                    },
                    {
                      label: 'Lead',
                      render: (audit) => (
                        <Link
                          component={RouterLink}
                          to={paths.lead(audit.leadId)}
                          underline="hover"
                        >
                          Open lead
                        </Link>
                      ),
                    },
                    { label: 'Attempt', render: (audit) => audit.attempt },
                    {
                      label: 'Outcome',
                      render: (audit) => (
                        <Chip
                          size="small"
                          label={audit.outcome === 'completed' ? 'Completed' : 'Recheck raised'}
                          color={audit.outcome === 'completed' ? 'success' : 'warning'}
                          variant="outlined"
                        />
                      ),
                    },
                    { label: 'Comments', render: (audit) => audit.comments },
                  ]}
                  rows={data.recent}
                />
              )}
            </Paper>
          </Stack>
        )}
      </PageState>
    </>
  )
}

export default TeamDashboard
