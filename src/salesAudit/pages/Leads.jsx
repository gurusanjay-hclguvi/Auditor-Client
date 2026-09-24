import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Box, Button, Chip, Snackbar, Stack, Tab, Tabs } from '@mui/material'
import { FilterListRounded as FilterListRoundedIcon } from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import SalesActionTable from '../components/salesTable/SalesActionTable'
import LeadFilterDrawer from '../components/leads/LeadFilterDrawer'
import { getLeads, sendLeadReminder } from '../apiCalls/salesAuditApi'
import { useApi } from '../utils/useApi'
import { useCurrentUser } from '../utils/roles'
import { describeFilter, matchesFilters } from '../utils/leadFilters'
import {
  LEAD_STAGES,
  getLeadStage,
  hasCreditStatus,
  isSapOverdue,
  needsEscalation,
} from '../utils/leadStatus'

const TABS = {
  [LEAD_STAGES.pending]: {
    label: 'Sales Action Pending',
    emptyMessage: 'No leads are waiting on payment verification.',
  },
  [LEAD_STAGES.awaiting]: {
    label: 'Awaiting Audit',
    emptyMessage: 'No leads with every payment verified are waiting for audit.',
  },
  [LEAD_STAGES.audited]: {
    label: 'Audited',
    emptyMessage: 'No leads have been audited yet.',
  },
}

const TICK_MS = 60 * 1000

function resolveTab(tab) {
  return tab in TABS ? tab : LEAD_STAGES.pending
}

function getPendingSummary(leads, now) {
  return [
    {
      label: 'Paid, not verified',
      color: 'warning',
      count: leads.filter((lead) => hasCreditStatus(lead, 'unverified')).length,
    },
    {
      label: 'Mismatch',
      color: 'error',
      count: leads.filter((lead) => hasCreditStatus(lead, 'mismatch')).length,
    },
    {
      label: 'Overdue >24h',
      color: 'error',
      count: leads.filter((lead) => needsEscalation(lead) && isSapOverdue(lead, now)).length,
    },
  ]
}

// All Leads, or with `mine` the auditor's own (auditCoordinator = the signed-in auditor).
function Leads({ mine = false }) {
  const user = useCurrentUser()
  const token = useSelector((state) => state.reducers.commonData.authToken)
  const canSend = useSelector((state) =>
    Boolean(state.reducers.commonData.permission.salesAudit?.write),
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = resolveTab(searchParams.get('tab'))

  const { data, loading, error, reload } = useApi(getLeads)
  const [now, setNow] = useState(() => Date.now())
  const [sendingId, setSendingId] = useState(null)
  const [dismissedSweep, setDismissedSweep] = useState(null)
  const [sendError, setSendError] = useState(null)
  const [filters, setFilters] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Keeps "Time in SAP" and "Auto-mail in …" current without refetching.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [])

  const leadsByStage = useMemo(() => {
    const grouped = Object.fromEntries(Object.keys(TABS).map((stage) => [stage, []]))
    data?.leads
      .filter((lead) => !mine || lead.auditCoordinator.toLowerCase() === user.email)
      .filter((lead) => matchesFilters(lead, filters, now))
      .forEach((lead) => grouped[getLeadStage(lead)].push(lead))
    return grouped
  }, [data, mine, user.email, filters, now])

  const visibleLeads = leadsByStage[tab]
  const showSweepToast = data?.mailsSentThisSweep > 0 && dismissedSweep !== data

  async function handleSend(leadId) {
    setSendingId(leadId)
    try {
      await sendLeadReminder(token, leadId)
      reload()
    } catch (sendFailure) {
      setSendError(sendFailure.message)
    } finally {
      setSendingId(null)
    }
  }

  return (
    <Box>
      <PageHeader
        title={mine ? 'My Leads' : 'All Leads'}
        subtitle={
          mine
            ? `Leads assigned to you (${user.email}) as audit coordinator; audit them once they reach Awaiting Audit`
            : 'Every lead; they move to Awaiting Audit once every payment is verified, and are audited there'
        }
      />

      <Tabs
        value={tab}
        onChange={(_, next) => setSearchParams({ tab: next })}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {Object.entries(TABS).map(([key, { label }]) => (
          <Tab
            key={key}
            value={key}
            label={data ? `${label} (${leadsByStage[key].length})` : label}
          />
        ))}
      </Tabs>

      <PageState
        loading={loading}
        error={error}
        empty={visibleLeads.length === 0 && filters.length === 0}
        emptyMessage={mine ? `${TABS[tab].emptyMessage} (among leads assigned to you)` : TABS[tab].emptyMessage}
        onRetry={reload}
      >
        {tab === LEAD_STAGES.pending && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
            {getPendingSummary(visibleLeads, now).map((item) => (
              <Chip
                key={item.label}
                label={`${item.label}: ${item.count}`}
                color={item.count ? item.color : 'default'}
                variant="outlined"
              />
            ))}
          </Stack>
        )}
        {filters.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
            {filters.map((filter) => (
              <Chip
                key={filter.id}
                label={describeFilter(filter)}
                size="small"
                color="primary"
                variant="outlined"
                onDelete={() => setFilters((current) => current.filter((item) => item.id !== filter.id))}
              />
            ))}
            <Chip label="Clear filters" size="small" onClick={() => setFilters([])} />
          </Stack>
        )}
        {filters.length > 0 && visibleLeads.length === 0 && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            No leads in this tab match the filters.
          </Alert>
        )}
        <SalesActionTable
          actions={
            <Badge badgeContent={filters.length} color="primary">
              <Button
                size="small"
                variant="outlined"
                startIcon={<FilterListRoundedIcon />}
                onClick={() => setFiltersOpen(true)}
              >
                Filters
              </Button>
            </Badge>
          }
          leads={visibleLeads}
          showEscalation={tab === LEAD_STAGES.pending}
          now={now}
          canSend={canSend}
          sendingId={sendingId}
          onSend={handleSend}
        />
      </PageState>

      {filtersOpen && (
        <LeadFilterDrawer
          open
          filters={filters}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setFilters(next)
            setFiltersOpen(false)
          }}
        />
      )}

      <Snackbar
        open={showSweepToast}
        autoHideDuration={6000}
        onClose={() => setDismissedSweep(data)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="info" variant="filled" onClose={() => setDismissedSweep(data)}>
          Auto-escalation: {data?.mailsSentThisSweep} lead
          {data?.mailsSentThisSweep === 1 ? '' : 's'} over 24h in SAP mailed to BDA &amp; Accounts
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(sendError)}
        autoHideDuration={6000}
        onClose={() => setSendError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setSendError(null)}>
          {sendError}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Leads
