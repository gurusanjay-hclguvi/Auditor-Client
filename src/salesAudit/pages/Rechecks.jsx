import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { AddRounded as AddRoundedIcon } from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import RechecksTable from '../components/rechecks/RechecksTable'
import RaiseRecheckDialog from '../components/rechecks/RaiseRecheckDialog'
import CcStatusTable from '../components/rechecks/CcStatusTable'
import CcPendingDialog from '../components/rechecks/CcPendingDialog'
import {
  getLeadSummaries,
  getRechecks,
  raiseRecheck,
  resolveRecheck,
  updateCcResponse,
} from '../apiCalls/salesAuditApi'
import { useApi } from '../utils/useApi'
import { RECHECK_CATEGORIES, getCcStatus } from '../utils/recheckStatus'
import { contactName } from '../utils/formatters'

const TABS = {
  rechecks: 'Rechecks',
  cc: 'CC Status',
}

const STATUS_FILTERS = { open: 'Open', resolved: 'Resolved', all: 'All' }

const fetchRechecksPage = (token) => Promise.all([getRechecks(token), getLeadSummaries(token)])

function resolveTab(tab) {
  return tab in TABS ? tab : 'rechecks'
}

function Rechecks() {
  const token = useSelector((state) => state.reducers.commonData.authToken)
  const canEdit = useSelector((state) =>
    Boolean(state.reducers.commonData.permission.salesAudit?.write),
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = resolveTab(searchParams.get('tab'))

  const { data, loading, error, reload } = useApi(fetchRechecksPage)
  const [rechecks, leads] = data ?? [[], []]

  const [category, setCategory] = useState(() =>
    searchParams.get('category') in RECHECK_CATEGORIES ? searchParams.get('category') : 'all',
  )
  const [statusFilter, setStatusFilter] = useState(() =>
    searchParams.get('status') in STATUS_FILTERS ? searchParams.get('status') : 'open',
  )
  const [raiseOpen, setRaiseOpen] = useState(false)
  const [pendingLead, setPendingLead] = useState(null)
  const [resolvingId, setResolvingId] = useState(null)
  const [toast, setToast] = useState(null)

  const rows = useMemo(() => {
    const leadsById = Object.fromEntries(leads.map((lead) => [lead.id, lead]))
    return rechecks.map((recheck) => ({ ...recheck, lead: leadsById[recheck.leadId] }))
  }, [rechecks, leads])

  const statusRows = rows.filter((row) => statusFilter === 'all' || row.status === statusFilter)
  const visibleRows = statusRows.filter((row) => category === 'all' || row.category === category)
  const pendingCcCount = leads.filter((lead) => getCcStatus(lead) === 'pending').length

  async function handleRaise(recheck) {
    await raiseRecheck(token, recheck)
    const lead = leads.find((candidate) => candidate.id === recheck.leadId)
    const bda = contactName(lead?.saleOwner)
    const bdm = contactName(lead?.saleOwnerManager)
    setRaiseOpen(false)
    setToast({ severity: 'success', message: `Recheck raised. Alerted BDA ${bda} and BDM ${bdm}.` })
    reload()
  }

  async function handleResolve(recheckId) {
    setResolvingId(recheckId)
    try {
      await resolveRecheck(token, recheckId)
      reload()
    } catch (resolveError) {
      setToast({ severity: 'error', message: resolveError.message })
    } finally {
      setResolvingId(null)
    }
  }

  async function handleCcResponse(leadId, response) {
    await updateCcResponse(token, leadId, response)
    setPendingLead(null)
    setToast({
      severity: 'success',
      message:
        response === 'mailNotSent'
          ? 'BDA alerted to send the CC mail.'
          : 'Marked as mail sent, awaiting acknowledgement.',
    })
    reload()
  }

  const tabLabel = (key) => {
    if (!data) return TABS[key]
    const count =
      key === 'rechecks' ? rows.filter((row) => row.status === 'open').length : pendingCcCount
    return `${TABS[key]} (${count})`
  }

  return (
    <Box>
      <PageHeader
        title="Rechecks"
        subtitle="Issues raised by auditors, and confirmation-call status per lead"
        action={
          canEdit && (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => setRaiseOpen(true)}
              disabled={!data}
            >
              Raise recheck
            </Button>
          )
        }
      />

      <Tabs
        value={tab}
        onChange={(_, next) => setSearchParams({ tab: next })}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {Object.keys(TABS).map((key) => (
          <Tab key={key} value={key} label={tabLabel(key)} />
        ))}
      </Tabs>

      <PageState loading={loading} error={error} onRetry={reload}>
        {tab === 'rechecks' ? (
          <>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                <Chip
                  label={`All (${statusRows.length})`}
                  color={category === 'all' ? 'primary' : 'default'}
                  variant={category === 'all' ? 'filled' : 'outlined'}
                  onClick={() => setCategory('all')}
                />
                {Object.entries(RECHECK_CATEGORIES).map(([key, { label }]) => (
                  <Chip
                    key={key}
                    label={`${label} (${statusRows.filter((row) => row.category === key).length})`}
                    color={category === key ? 'primary' : 'default'}
                    variant={category === key ? 'filled' : 'outlined'}
                    onClick={() => setCategory(key)}
                  />
                ))}
              </Stack>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={statusFilter}
                onChange={(_, next) => next && setStatusFilter(next)}
              >
                {Object.entries(STATUS_FILTERS).map(([key, label]) => (
                  <ToggleButton key={key} value={key} sx={{ px: 2 }}>
                    {label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
            <PageState
              empty={visibleRows.length === 0}
              emptyMessage="No rechecks match these filters."
            >
              <RechecksTable
                rows={visibleRows}
                canEdit={canEdit}
                resolvingId={resolvingId}
                onResolve={handleResolve}
              />
            </PageState>
          </>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                label={`Completed: ${leads.length - pendingCcCount}`}
                color="success"
                variant="outlined"
              />
              <Chip label={`Pending: ${pendingCcCount}`} color="warning" variant="outlined" />
            </Stack>
            <PageState empty={leads.length === 0} emptyMessage="No leads found.">
              <CcStatusTable leads={leads} canEdit={canEdit} onOpenPending={setPendingLead} />
            </PageState>
          </>
        )}
      </PageState>

      {raiseOpen && (
        <RaiseRecheckDialog
          open
          leads={leads}
          onClose={() => setRaiseOpen(false)}
          onSubmit={handleRaise}
        />
      )}
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
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
    </Box>
  )
}

export default Rechecks
