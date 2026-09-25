import { useState } from 'react'
import {
  Button,
  Link,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import DataTable from '../components/common/DataTable'
import { AuditStatusChip, CcStatusChip } from '../components/common/Chips'
import RechecksTable from '../components/rechecks/RechecksTable'
import CloseRecheckDialog from '../components/dialogs/CloseRecheckDialog'
import { getCcStatus, getRechecks } from '../apiCalls/salesAuditApi'
import { DATE_PRESETS, RECHECK_CATEGORIES } from '../utils/labels'
import { formatDateTime } from '../utils/formatters'
import { paths } from '../utils/routePaths'
import { isAuditRole, useCurrentUser } from '../utils/roles'
import { keyedFetcher, useApi } from '../utils/useApi'

const VIEWS = [
  { value: '', label: 'All' },
  { value: 'raisedNotClosed', label: 'Raised, not closed' },
  { value: 'closedAuditPending', label: 'Closed · audit pending' },
  { value: 'closed', label: 'Closed' },
]
const rechecksFetcher = keyedFetcher((filters) => (token) => getRechecks(token, filters))
const ccStatusFetcher = keyedFetcher((filters) => (token) => getCcStatus(token, filters))
const TICKET_KEYS = ['view', 'category', 'raisedIn', 'closedIn', 'bdaEmail', 'scope']

function Select({ label, value, onChange, options, width = 170 }) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth: width }}
    >
      <MenuItem value="">Any</MenuItem>
      {options.map(([optionValue, optionLabel]) => (
        <MenuItem key={optionValue} value={optionValue}>
          {optionLabel}
        </MenuItem>
      ))}
    </TextField>
  )
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
  const defaultScope = user.role === 'auditor' ? 'mine' : 'all'
  const filters = Object.fromEntries(TICKET_KEYS.map((key) => [key, params.get(key) ?? '']))
  const scope = filters.scope || defaultScope
  const query = JSON.stringify({ ...filters, scope })
  const { data, loading, error, reload } = useApi(rechecksFetcher(query))
  const presets = DATE_PRESETS.map((preset) => [preset.value, preset.label])

  return (
    <>
      <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center" sx={{ mb: 2 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filters.view}
          onChange={(_, value) => value !== null && update({ view: value })}
        >
          {VIEWS.map((view) => (
            <ToggleButton key={view.value} value={view.value}>
              {view.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {auditRole && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={scope}
            onChange={(_, value) => value && update({ scope: value })}
          >
            <ToggleButton value="mine">My leads</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>
        )}
        <Select
          label="Category"
          value={filters.category}
          onChange={(value) => update({ category: value })}
          options={Object.entries(RECHECK_CATEGORIES)}
        />
        <Select
          label="Raised"
          value={filters.raisedIn}
          onChange={(value) => update({ raisedIn: value })}
          options={presets}
          width={140}
        />
        <Select
          label="Closed"
          value={filters.closedIn}
          onChange={(value) => update({ closedIn: value })}
          options={presets}
          width={140}
        />
        {user.role === 'bdm' && (
          <Select
            label="BDA"
            value={filters.bdaEmail}
            onChange={(value) => update({ bdaEmail: value })}
            options={user.teamEmails.map((email) => [email, email])}
            width={220}
          />
        )}
        {TICKET_KEYS.some((key) => key !== 'scope' && filters[key]) && (
          <Button onClick={() => update(Object.fromEntries(TICKET_KEYS.map((key) => [key, ''])))}>
            Clear filters
          </Button>
        )}
      </Stack>
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
        {data && <DataTable columns={columns} rows={data.items} />}
      </PageState>
    </>
  )
}

export default Rechecks
