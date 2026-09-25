import { useCallback, useState } from 'react'
import {
  Button,
  Link,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import DataTable from '../components/common/DataTable'
import FilterBar from '../components/common/FilterBar'
import { AuditStatusChip, CcStatusChip } from '../components/common/Chips'
import RechecksTable from '../components/rechecks/RechecksTable'
import CloseRecheckDialog from '../components/dialogs/CloseRecheckDialog'
import { getCcStatus, getMembers, getRechecks } from '../apiCalls/salesAuditApi'
import { DATE_PRESETS, RECHECK_CATEGORIES } from '../utils/labels'
import { formatDateTime } from '../utils/formatters'
import { paths } from '../utils/routePaths'
import { isAuditRole, useCurrentUser } from '../utils/roles'
import { keyedFetcher, useApi } from '../utils/useApi'

const rechecksFetcher = keyedFetcher((filters) => (token) => getRechecks(token, filters))
const ccStatusFetcher = keyedFetcher((filters) => (token) => getCcStatus(token, filters))
// The ticket filters in the URL; scope (My leads / All) sits apart from them.
const TICKET_KEYS = [
  'search',
  'view',
  'category',
  'raisedIn',
  'closedIn',
  'auditorEmail',
  'bdaEmail',
]
const presetOptions = DATE_PRESETS.map((preset) => [preset.value, preset.label])

const TICKET_SHORTCUTS = [
  { label: 'Raised, not closed', filters: { view: 'raisedNotClosed' } },
  { label: 'Closed · audit pending', filters: { view: 'closedAuditPending' } },
  { label: 'Raised this month', filters: { raisedIn: 'thisMonth' } },
  { label: 'Closed this month', filters: { closedIn: 'thisMonth' } },
  {
    label: 'Raised & closed last month',
    filters: { raisedIn: 'lastMonth', closedIn: 'lastMonth' },
  },
]

// The drawer's blocks; values are comma lists ("any of") except the `single` ones. Auditor and
// BDA only show for the roles that can pick them.
function ticketFilterFields({ auditors, bdas }) {
  return [
    {
      key: 'view',
      label: 'Status',
      options: [
        ['raisedNotClosed', 'Raised, not closed'],
        ['closedAuditPending', 'Closed · audit pending'],
        ['closed', 'Closed'],
      ],
      single: true,
    },
    { key: 'category', label: 'Reason', options: Object.entries(RECHECK_CATEGORIES) },
    // One time window each.
    { key: 'raisedIn', label: 'Raised', options: presetOptions, single: true },
    { key: 'closedIn', label: 'Closed', options: presetOptions, single: true },
    auditors && {
      key: 'auditorEmail',
      label: 'Auditor',
      options: auditors.map((auditor) => [auditor.email, auditor.name]),
    },
    bdas && { key: 'bdaEmail', label: 'BDA', options: bdas },
  ].filter(Boolean)
}

// Recheck tickets: auditors see those on their leads (or all), a BDA those on their leads, a BDM
// their team's. Under it, the CC status of leads (updated in Zoho from Superleap, or pending).
function Rechecks() {
  const user = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const tab = isAuditRole(user.role) && params.get('tab') === 'cc' ? 'cc' : 'tickets'

  function update(changes) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    )
    setParams(next)
  }

  return (
    <>
      <PageHeader
        title={isAuditRole(user.role) ? 'Rechecks' : 'Tickets'}
        subtitle="Rechecks raised by the audit team, until the BDA fixes and closes them and the lead is audited again."
      />
      {isAuditRole(user.role) && (
        <Tabs
          value={tab}
          onChange={(_, value) => setParams(value === 'cc' ? { tab: 'cc' } : {})}
          sx={{ mb: 2 }}
        >
          <Tab value="tickets" label="Tickets" />
          <Tab value="cc" label="CC status" />
        </Tabs>
      )}
      {tab === 'cc' ? <CcStatusList update={update} /> : <Tickets update={update} />}
    </>
  )
}

function Tickets({ update }) {
  const user = useCurrentUser()
  const [params] = useSearchParams()
  const [closing, setClosing] = useState(null)
  const [notice, setNotice] = useState(null)
  const auditRole = isAuditRole(user.role)
  const scope = params.get('scope') || (user.role === 'auditor' ? 'mine' : 'all')
  const filters = Object.fromEntries(
    TICKET_KEYS.filter((key) => params.get(key)).map((key) => [key, params.get(key)]),
  )
  const query = JSON.stringify({ ...filters, scope })
  const { data, loading, error, reload } = useApi(rechecksFetcher(query))
  // Auditors pick from every auditor and BDA; a BDM from their own BDAs.
  const { data: members } = useApi(
    useCallback(
      (token) =>
        auditRole
          ? Promise.all([getMembers(token, 'auditor'), getMembers(token, 'bda')])
          : Promise.resolve(null),
      [auditRole],
    ),
  )
  const fields = ticketFilterFields({
    auditors: auditRole ? (members?.[0] ?? []) : null,
    bdas: auditRole
      ? (members?.[1] ?? []).map((bda) => [bda.email, bda.name])
      : user.role === 'bdm'
        ? user.teamEmails.map((email) => [email, email])
        : null,
  })

  return (
    <>
      {auditRole && (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={scope}
          onChange={(_, value) => value && update({ scope: value })}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="mine">My leads</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      )}
      <FilterBar
        filters={filters}
        onChange={(next) =>
          update({ ...Object.fromEntries(TICKET_KEYS.map((key) => [key, ''])), ...next })
        }
        fields={fields}
        shortcuts={TICKET_SHORTCUTS}
        searchLabel="Search recheck ID, learner, Zen ID, comments"
      />
      <PageState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={data?.length === 0}
        emptyMessage="No rechecks match these filters."
      >
        {data && <RechecksTable rechecks={data} onClose={setClosing} />}
      </PageState>
      <CloseRecheckDialog
        recheck={closing}
        onClose={() => setClosing(null)}
        onClosed={(recheck) => {
          setNotice(`${recheck.recheckNo} closed; the auditor was told to audit again`)
          reload()
        }}
      />
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </>
  )
}

function CcStatusList({ update }) {
  const user = useCurrentUser()
  const [params] = useSearchParams()
  const status = params.get('ccStatus') ?? ''
  const scope = params.get('scope') ?? (user.role === 'auditor' ? 'mine' : 'all')
  const query = JSON.stringify({ status, scope, pageSize: 100 })
  const { data, loading, error, reload } = useApi(ccStatusFetcher(query))
  const columns = [
    {
      label: 'Lead',
      render: (lead) => (
        <Link component={RouterLink} to={paths.lead(lead.id)} underline="hover">
          {lead.personal.name}
        </Link>
      ),
    },
    { label: 'Auditor', render: (lead) => lead.assignment?.auditorEmail || '—' },
    { label: 'BDA', render: (lead) => lead.bdaEmail || '—' },
    { label: 'CC', render: (lead) => <CcStatusChip status={lead.cc.status} /> },
    { label: 'CC updated', render: (lead) => formatDateTime(lead.cc.updatedAt) },
    { label: 'Audit', render: (lead) => <AuditStatusChip status={lead.audit.status} /> },
    {
      label: 'Actions',
      render: (lead) =>
        lead.cc.status === 'updated' && (
          <Button
            size="small"
            variant="outlined"
            component={RouterLink}
            to={paths.ccVerification(lead.id)}
          >
            Verify CC
          </Button>
        ),
    },
  ]
  return (
    <>
      <Stack direction="row" gap={1.5} sx={{ mb: 2 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={status}
          onChange={(_, value) => value !== null && update({ ccStatus: value })}
        >
          <ToggleButton value="">All</ToggleButton>
          <ToggleButton value="updated">CC updated</ToggleButton>
          <ToggleButton value="pending">CC pending</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={scope}
          onChange={(_, value) => value && update({ scope: value })}
        >
          <ToggleButton value="mine">My leads</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <PageState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={data?.items.length === 0}
        emptyMessage="No leads waiting on a CC here."
      >
        {data && <DataTable columns={columns} rows={data.items} storageKey="ccStatus" />}
      </PageState>
    </>
  )
}

export default Rechecks
