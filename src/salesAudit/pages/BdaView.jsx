import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useSelector } from 'react-redux'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import TrendDelta from '../components/common/TrendDelta'
import ActionTile from '../components/bda/ActionTile'
import ActionList from '../components/bda/ActionList'
import AlertsTable from '../components/bda/AlertsTable'
import PatternList from '../components/overview/PatternList'
import CcStatusTable from '../components/rechecks/CcStatusTable'
import CcPendingDialog from '../components/rechecks/CcPendingDialog'
import { getAuditHistory, getLeads, updateCcResponse } from '../apiCalls/salesAuditApi'
import { useApi } from '../utils/useApi'
import {
  ACTION_TYPES,
  ALERT_SOURCES,
  buildActionItems,
  buildAlertFeed,
  getBdaOptions,
  isCcActionNeeded,
  isOwnedBy,
} from '../utils/bdaMetrics'
import {
  RESPONSE_TARGET_HOURS,
  computeResponseTimes,
  computeTrends,
  findRepeatPatterns,
  getPeriods,
  scopeHistory,
} from '../utils/auditHistory'
import { getCcStatus } from '../utils/recheckStatus'
import { formatCurrency, formatDuration } from '../utils/formatters'
import { paths } from '../utils/routePaths'

const TABS = { todo: 'To do', cc: 'CC Updates', alerts: 'Alerts' }
const INSIGHT_DAYS = 30

const ALERT_FILTERS = {
  all: { label: 'All', matches: () => true },
  actionNeeded: { label: 'Action needed', matches: (alert) => alert.actionNeeded },
  auditor: {
    label: 'From auditor',
    matches: (alert) => ALERT_SOURCES[alert.source].group === 'auditor',
  },
  automated: {
    label: 'Automated',
    matches: (alert) => ALERT_SOURCES[alert.source].group === 'automated',
  },
}

// Leads is called first so its escalation sweep lands in the history's mail log.
const fetchBdaView = (token) => Promise.all([getLeads(token), getAuditHistory(token)])
const EMPTY_DATA = [{ leads: [] }, { rechecks: [], payments: [], alerts: [] }]

function TodoTab({ items, leads, scopedHistory, now, onUpdateCc }) {
  const [typeFilter, setTypeFilter] = useState(null)

  const insights = useMemo(() => {
    const recentPeriods = getPeriods(now, INSIGHT_DAYS)
    return {
      openTrend: computeTrends(scopedHistory, getPeriods(now, 7)).openRechecks,
      patterns: findRepeatPatterns(scopedHistory, leads, recentPeriods),
      responseTimes: computeResponseTimes(scopedHistory, leads, recentPeriods),
    }
  }, [scopedHistory, leads, now])

  const byType = (type) => items.filter((item) => item.type === type)
  const overdue = byType('payment').filter((item) => item.priority === 1).length
  const outstanding = byType('balance').reduce((total, item) => total + item.balance, 0)
  const visibleItems = typeFilter ? byType(typeFilter) : items
  const measured = insights.responseTimes.filter((metric) => metric.current.medianS != null)

  const tiles = [
    {
      type: 'payment',
      detail: (
        <Typography variant="caption" sx={{ color: overdue ? 'error.main' : 'text.secondary' }}>
          {overdue ? `${overdue} over 24h · Accounts already mailed` : 'All under 24h'}
        </Typography>
      ),
    },
    {
      type: 'recheck',
      detail: <TrendDelta trend={insights.openTrend} periodLabel="last week" />,
    },
    {
      type: 'cc',
      detail: (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Tell us if the CC mail was sent
        </Typography>
      ),
    },
    {
      type: 'balance',
      detail: (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {formatCurrency(outstanding)} outstanding
        </Typography>
      ),
    },
  ]

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        {tiles.map((tile) => (
          <Grid item xs={12} sm={6} md={3} key={tile.type}>
            <ActionTile
              label={ACTION_TYPES[tile.type]}
              count={byType(tile.type).length}
              detail={tile.detail}
              selected={typeFilter === tile.type}
              onClick={() => setTypeFilter(typeFilter === tile.type ? null : tile.type)}
            />
          </Grid>
        ))}
      </Grid>

      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {typeFilter ? ACTION_TYPES[typeFilter] : 'Your to-do list'} ({visibleItems.length})
          </Typography>
          {typeFilter && (
            <Chip
              label="Show all"
              size="small"
              onClick={() => setTypeFilter(null)}
              onDelete={() => setTypeFilter(null)}
            />
          )}
        </Stack>
        <PageState empty={visibleItems.length === 0} emptyMessage="You're all caught up.">
          <ActionList items={visibleItems} onUpdateCc={onUpdateCc} />
        </PageState>
      </Box>

      {(insights.patterns.length > 0 || measured.length > 0) && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Your patterns &amp; response times
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Last {INSIGHT_DAYS} days, against the {RESPONSE_TARGET_HOURS}h target
          </Typography>
          {measured.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
              {measured.map((metric) => {
                const overTarget = metric.current.medianS > RESPONSE_TARGET_HOURS * 60 * 60
                const median = formatDuration(metric.current.medianS * 1000)
                return (
                  <Chip
                    key={metric.key}
                    variant="outlined"
                    color={overTarget ? 'error' : 'success'}
                    label={`${metric.label}: ${median} median · ${
                      overTarget ? 'over target' : 'on target'
                    }`}
                  />
                )
              })}
            </Stack>
          )}
          <PatternList
            patterns={insights.patterns}
            showBdaLink={false}
            emptyMessage="No repeat issues on your leads. Keep it up."
          />
        </Paper>
      )}
    </Stack>
  )
}

function BdaView() {
  const token = useSelector((state) => state.reducers.commonData.authToken)
  const canEdit = useSelector((state) =>
    Boolean(state.reducers.commonData.permission.salesAudit?.write),
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') in TABS ? searchParams.get('tab') : 'todo'

  const { data, loading, error, reload } = useApi(fetchBdaView)
  const [leadsResponse, history] = data ?? EMPTY_DATA
  const allLeads = leadsResponse.leads
  const { rechecks } = history

  const [now] = useState(() => Date.now())
  const [alertFilter, setAlertFilter] = useState('all')
  const [pendingLead, setPendingLead] = useState(null)
  const [toast, setToast] = useState(null)

  const bdaOptions = useMemo(() => getBdaOptions(allLeads), [allLeads])
  const selectedBda =
    bdaOptions.find((option) => option.email === searchParams.get('bda')) ?? bdaOptions[0]

  const view = useMemo(() => {
    const leads = selectedBda ? allLeads.filter((lead) => isOwnedBy(lead, selectedBda.email)) : []
    return {
      leads,
      scopedHistory: scopeHistory(history, leads),
      actionItems: buildActionItems(leads, rechecks, now),
      alerts: buildAlertFeed(leads, rechecks),
      ccLeads: [...leads].sort(
        (a, b) => Number(isCcActionNeeded(b)) - Number(isCcActionNeeded(a)),
      ),
    }
  }, [allLeads, history, rechecks, selectedBda, now])

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    next.set(key, value)
    setSearchParams(next)
  }

  async function handleCcResponse(leadId, response) {
    await updateCcResponse(token, leadId, response)
    setPendingLead(null)
    setToast(
      response === 'mailNotSent'
        ? 'Saved. A reminder to send the CC mail has been mailed to you.'
        : 'Saved as mail sent, awaiting acknowledgement.',
    )
    reload()
  }

  const { alerts, actionItems } = view
  const openAlerts = alerts.filter((alert) => alert.actionNeeded).length
  const visibleAlerts = alerts.filter(ALERT_FILTERS[alertFilter].matches)
  const pendingCc = view.leads.filter((lead) => getCcStatus(lead) === 'pending').length

  const tabCounts = { todo: actionItems.length, cc: pendingCc, alerts: openAlerts }

  return (
    <Box>
      <PageHeader
        title={selectedBda ? `BDA View · ${selectedBda.name}` : 'BDA View'}
        subtitle="What to do next on your leads, your CCs, and the alerts raised on them"
        action={
          bdaOptions.length > 0 && (
            <TextField
              select
              size="small"
              label="Viewing as"
              value={selectedBda?.email ?? ''}
              onChange={(event) => setParam('bda', event.target.value)}
              sx={{ minWidth: 220 }}
            >
              {bdaOptions.map((option) => (
                <MenuItem key={option.email} value={option.email}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          )
        }
      />

      <PageState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={!selectedBda}
        emptyMessage="No BDAs found in the lead data."
      >
        <Tabs
          value={tab}
          onChange={(_, next) => setParam('tab', next)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {Object.entries(TABS).map(([key, label]) => (
            <Tab
              key={key}
              value={key}
              label={tabCounts[key] ? `${label} (${tabCounts[key]})` : label}
            />
          ))}
        </Tabs>

        {tab === 'todo' && (
          <PageState empty={view.leads.length === 0} emptyMessage="This BDA has no leads yet.">
            <TodoTab
              items={actionItems}
              leads={view.leads}
              scopedHistory={view.scopedHistory}
              now={now}
              onUpdateCc={setPendingLead}
            />
          </PageState>
        )}

        {tab === 'cc' && (
          <>
            {!canEdit && (
              <Alert severity="info" sx={{ mb: 2 }}>
                You have view-only access, so CC updates are disabled.
              </Alert>
            )}
            <PageState empty={view.ccLeads.length === 0} emptyMessage="No leads to show.">
              <CcStatusTable
                leads={view.ccLeads}
                canEdit={canEdit}
                onOpenPending={setPendingLead}
              />
            </PageState>
          </>
        )}

        {tab === 'alerts' && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
              {Object.entries(ALERT_FILTERS).map(([key, { label, matches }]) => (
                <Chip
                  key={key}
                  label={`${label} (${alerts.filter(matches).length})`}
                  color={alertFilter === key ? 'primary' : 'default'}
                  variant={alertFilter === key ? 'filled' : 'outlined'}
                  onClick={() => setAlertFilter(key)}
                />
              ))}
              <Box sx={{ flex: 1 }} />
              <Button component={RouterLink} to={paths.rechecks()} size="small">
                All rechecks
              </Button>
            </Stack>
            <PageState
              empty={visibleAlerts.length === 0}
              emptyMessage="No alerts match this filter."
            >
              <AlertsTable alerts={visibleAlerts} />
            </PageState>
          </>
        )}
      </PageState>

      {pendingLead && (
        <CcPendingDialog
          lead={pendingLead}
          onClose={() => setPendingLead(null)}
          onSubmit={handleCcResponse}
        />
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default BdaView
