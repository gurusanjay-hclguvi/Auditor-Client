import { useCallback, useRef, useState } from 'react'
import { Alert, Button, Snackbar, Stack, Tab, TablePagination, Tabs } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import LeadFilterSidebar from '../components/leads/LeadFilterSidebar'
import LeadsTable from '../components/leads/LeadsTable'
import {
  assignLeads,
  getLeads,
  getMembers,
  importZoho,
  takeUpLead,
} from '../apiCalls/salesAuditApi'
import {
  LEAD_TABS,
  auditStatusFor,
  filterFieldsFor,
  leadsLink,
  rulesOf,
  tabOf,
} from '../utils/leadFilters'
import { isAuditRole, useCanWrite, useCurrentUser } from '../utils/roles'
import { useAction } from '../utils/useAction'
import { useApi } from '../utils/useApi'

const PAGE_SIZE = 25
const loadAuditors = (token) => getMembers(token, 'auditor')

// All Leads (every lead, with every stage from coming in to audit completed) and My Leads (the
// audit coordinator's own). BDAs and BDMs get their own / their team's leads here. Three tabs split
// the leads waiting for an audit (new, or to audit again after a closed recheck), the ones with a
// recheck open, and the completed ones. The tab, search and filter rules live in the URL so a
// filtered list can be shared.
function Leads({ mine = false }) {
  const user = useCurrentUser()
  const canWrite = useCanWrite()
  const [params, setParams] = useSearchParams()
  const [notice, setNotice] = useState(null)
  const fileInput = useRef(null)

  const tab = tabOf(params)
  const fields = filterFieldsFor(tab)
  const rules = rulesOf(params).filter((rule) => fields.some((field) => field.key === rule.field))
  const search = params.get('search') ?? ''
  const page = Number(params.get('page')) || 1
  const query = JSON.stringify({
    search,
    filters: rules.length ? JSON.stringify(rules) : '',
    auditStatus: auditStatusFor(tab),
    page,
  })
  const { data, loading, error, reload } = useApi(
    useCallback(
      (token) =>
        getLeads(token, {
          ...JSON.parse(query),
          scope: mine ? 'mine' : 'all',
          pageSize: PAGE_SIZE,
        }),
      [query, mine],
    ),
  )
  const auditRole = isAuditRole(user.role)
  const { data: auditors } = useApi(
    useCallback(
      (token) => (auditRole && !mine ? loadAuditors(token) : Promise.resolve(null)),
      [auditRole, mine],
    ),
  )

  const takeUp = useAction(takeUpLead)
  const assign = useAction(assignLeads)
  const importer = useAction(importZoho)
  const actionError = takeUp.error || assign.error || importer.error

  // New filters start from page 1 of the same tab.
  function go(next) {
    const link = leadsLink({ tab, rules, search, ...next })
    setParams(new URLSearchParams(link.split('?')[1] ?? ''))
  }

  // Switching tab keeps the search and rules, except the audit status only Pending Audits takes.
  function setTab(nextTab) {
    const keys = filterFieldsFor(nextTab).map((field) => field.key)
    go({ tab: nextTab, rules: rules.filter((rule) => keys.includes(rule.field)) })
  }

  function setPage(next) {
    const search = new URLSearchParams(params)
    search.set('page', String(next))
    setParams(search)
  }

  async function onTakeUp(lead) {
    if (await takeUp.run(lead.id)) {
      setNotice(`${lead.personal.name} is now yours`)
      reload()
    }
  }

  async function onAssign() {
    const result = await assign.run()
    if (result) {
      setNotice(
        `${result.assigned} lead(s) assigned${result.unassigned ? `, ${result.unassigned} with no audit coordinator in their region` : ''}`,
      )
      reload()
    }
  }

  async function onImport(file) {
    const result = await importer.run(file ? await file.text() : '')
    if (result) {
      setNotice(
        `Imported ${result.import.created} new and ${result.import.updated} updated lead(s); ${result.assignment.assigned} assigned`,
      )
      reload()
    }
  }

  const tlTools = user.role === 'auditorTl' && canWrite && !mine && (
    <Stack direction="row" gap={1}>
      <Button variant="outlined" onClick={() => onImport()} disabled={importer.busy}>
        Sync from Zoho
      </Button>
      <Button
        variant="outlined"
        onClick={() => fileInput.current?.click()}
        disabled={importer.busy}
      >
        Import Zoho file
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        hidden
        onChange={(event) => {
          const [file] = event.target.files
          event.target.value = ''
          if (file) onImport(file)
        }}
      />
      <Button variant="contained" onClick={onAssign} disabled={assign.busy}>
        Assign unassigned leads
      </Button>
    </Stack>
  )

  const title = mine
    ? 'My Leads'
    : auditRole
      ? 'All Leads'
      : user.role === 'bdm'
        ? "My team's leads"
        : 'My leads'
  const subtitle = mine
    ? 'Leads assigned to you for audit.'
    : auditRole
      ? 'Every lead, from coming in to the audit being completed.'
      : 'Leads you own and where their audit stands.'

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} action={tlTools} />
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        {LEAD_TABS.map((item) => (
          <Tab key={item.value} value={item.value} label={item.label} />
        ))}
      </Tabs>
      <LeadFilterSidebar
        fields={fields}
        rules={rules}
        onRulesChange={(next) => go({ rules: next })}
        search={search}
        onSearchChange={(next) => go({ search: next })}
        suggestions={{
          auditors: (auditors ?? []).map((auditor) => auditor.email),
          bdas: user.role === 'bdm' ? (user.teamEmails ?? []) : [],
        }}
      />
      <PageState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={data?.items.length === 0}
        emptyMessage={
          rules.length || search
            ? 'No leads match these filters.'
            : tab === 'completed'
              ? 'No completed audits yet.'
              : tab === 'rechecks'
                ? 'No leads with an open recheck.'
                : 'No leads waiting for an audit.'
        }
      >
        {data && (
          <>
            <LeadsTable leads={data.items} onTakeUp={onTakeUp} />
            <TablePagination
              component="div"
              count={data.total}
              page={data.page - 1}
              rowsPerPage={data.pageSize}
              rowsPerPageOptions={[data.pageSize]}
              onPageChange={(_, next) => setPage(next + 1)}
            />
          </>
        )}
      </PageState>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </>
  )
}

export default Leads
