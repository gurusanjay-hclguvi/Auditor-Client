import { useCallback, useState } from 'react'
import { Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import DataTable from '../components/common/DataTable'
import StatTile from '../components/common/StatTile'
import RechecksTable from '../components/rechecks/RechecksTable'
import CloseRecheckDialog from '../components/dialogs/CloseRecheckDialog'
import { CcTicketAlert } from '../components/rechecks/CcTicketAlert'
import { getBdaDashboard, getBdaDashboardSummary, getRechecks } from '../apiCalls/salesAuditApi'
import DashboardSummary from '../components/common/DashboardSummary'
import { MUTED_TEXT } from '../styles/tableSx'
import { DATE_PRESETS, categoryLabel } from '../utils/labels'
import { paths } from '../utils/routePaths'
import { useCurrentUser } from '../utils/roles'
import { useApi } from '../utils/useApi'

const loadDashboard = (filters) => (token) =>
  Promise.all([
    getBdaDashboard(token, filters),
    getRechecks(token, { view: 'raisedNotClosed', bdaEmail: filters.bdaEmail }),
    getRechecks(token, { view: 'ccUpdatedNotClosed', bdaEmail: filters.bdaEmail }),
  ]).then(([dashboard, pending, ccToClose]) => ({ ...dashboard, pending, ccToClose }))

// A BDA's performance: their leads, rechecks still to fix and fixed, by category. A BDM sees the
// same for every BDA under them, and can pick one.
function BdaDashboard() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const period = params.get('period') ?? ''
  const bdaEmail = params.get('bda') ?? ''
  const { data, loading, error, reload } = useApi(
    useCallback(
      (token) => loadDashboard({ periodIn: period, bdaEmail })(token),
      [period, bdaEmail],
    ),
  )
  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }
  const bdm = user.role === 'bdm'
  const [closing, setClosing] = useState(null)

  return (
    <>
      <PageHeader
        title={bdm ? "My team's performance" : 'My performance'}
        subtitle="Leads, and the rechecks the audit team raised on them."
        action={
          <Stack direction="row" gap={1.5}>
            <TextField
              select
              size="small"
              label="Rechecks raised"
              value={period}
              onChange={(event) => set('period', event.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Any time</MenuItem>
              {DATE_PRESETS.map((preset) => (
                <MenuItem key={preset.value} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>
            {bdm && (
              <TextField
                select
                size="small"
                label="BDA"
                value={bdaEmail}
                onChange={(event) => set('bda', event.target.value)}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="">Whole team</MenuItem>
                {user.teamEmails.map((email) => (
                  <MenuItem key={email} value={email}>
                    {email}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        }
      />
      <PageState loading={loading} error={error} onRetry={reload}>
        {data && (
          <Stack gap={3}>
            <CcTicketAlert rechecks={data.ccToClose} bdm={bdm} onClose={setClosing} />
            {bdm && (
              <DashboardSummary
                api={getBdaDashboardSummary}
                filters={{ periodIn: period, bdaEmail }}
              />
            )}
            <Stack direction="row" gap={2} flexWrap="wrap">
              <StatTile
                label="Leads"
                value={data.totals.leads}
                onClick={() => navigate(paths.leads)}
              />
              <StatTile
                label="Audit completed"
                value={data.totals.auditCompleted}
                color="success.main"
                onClick={() => navigate(`${paths.leads}?tab=completed`)}
              />
              <StatTile
                label="Rechecks pending"
                value={data.totals.rechecksOpen}
                color="warning.main"
                onClick={() => navigate(paths.rechecks('view=raisedNotClosed'))}
              />
              <StatTile
                label="Rechecks closed"
                value={data.totals.rechecksClosed}
                onClick={() => navigate(paths.rechecks('view=closed'))}
              />
            </Stack>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Rechecks by category
              </Typography>
              {Object.keys(data.totals.byCategory).length === 0 ? (
                <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
                  No rechecks.
                </Typography>
              ) : (
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {Object.entries(data.totals.byCategory).map(([category, count]) => (
                    <Chip
                      key={category}
                      label={`${categoryLabel(category)}: ${count}`}
                      clickable
                      onClick={() => navigate(paths.rechecks(`category=${category}`))}
                    />
                  ))}
                </Stack>
              )}
            </Paper>
            {bdm && (
              <DataTable
                columns={[
                  { label: 'BDA', render: (row) => row.name },
                  { label: 'Leads', render: (row) => row.leads },
                  { label: 'Audit completed', render: (row) => row.auditCompleted },
                  { label: 'Rechecks pending', render: (row) => row.rechecksOpen },
                  { label: 'Rechecks closed', render: (row) => row.rechecksClosed },
                  {
                    label: 'By category',
                    render: (row) =>
                      Object.entries(row.byCategory)
                        .map(([category, count]) => `${categoryLabel(category)} ${count}`)
                        .join(', ') || '—',
                  },
                ]}
                rows={data.bdas.map((row) => ({ ...row, id: row.email }))}
              />
            )}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Tickets to fix
              </Typography>
              {data.pending.length === 0 ? (
                <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
                  Nothing pending.
                </Typography>
              ) : (
                <RechecksTable rechecks={data.pending} onClose={setClosing} />
              )}
            </Paper>
          </Stack>
        )}
      </PageState>
      <CloseRecheckDialog recheck={closing} onClose={() => setClosing(null)} onClosed={reload} />
    </>
  )
}

export default BdaDashboard
