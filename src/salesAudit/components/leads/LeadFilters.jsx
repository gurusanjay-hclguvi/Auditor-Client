import FilterBar from '../common/FilterBar'
import {
  AUDIT_STATUS,
  CC_STATUS,
  DATE_PRESETS,
  RECHECK_CATEGORIES,
  REGIONS,
} from '../../utils/labels'
import { LEAD_SHORTCUTS, PENDING_STATUSES } from '../../utils/leadFilters'

const presetOptions = DATE_PRESETS.map((preset) => [preset.value, preset.label])

// The drawer's blocks for a tab; values are comma lists ("any of") except the `single` ones.
// Auditor and BDA only show for the roles that can pick them. The Pending tab picks among the
// statuses before completed; the Completed tab has one status, so it filters on when instead.
function leadFilterFields({ tab, auditors, bdas }) {
  const pending = tab === 'pending'
  return [
    pending && {
      key: 'auditStatus',
      label: 'Audit status',
      options: PENDING_STATUSES.map((status) => [status, AUDIT_STATUS[status].label]),
    },
    { key: 'region', label: 'Region', options: REGIONS.map((region) => [region, region]) },
    auditors && {
      key: 'auditorEmail',
      label: 'Auditor',
      options: auditors.map((auditor) => [auditor.email, auditor.name]),
    },
    bdas && { key: 'bdaEmail', label: 'BDA', options: bdas.map((bda) => [bda, bda]) },
    {
      key: 'ccStatus',
      label: 'CC status',
      options: Object.entries(CC_STATUS).map(([key, { label }]) => [key, label]),
    },
    {
      key: 'recheckCategory',
      label: 'Recheck category',
      options: Object.entries(RECHECK_CATEGORIES),
    },
    // One time window each.
    { key: 'recheckRaisedIn', label: 'Recheck raised', options: presetOptions, single: true },
    { key: 'recheckClosedIn', label: 'Recheck closed', options: presetOptions, single: true },
    !pending && {
      key: 'completedIn',
      label: 'Audit completed',
      options: presetOptions,
      single: true,
    },
    pending && {
      key: 'awaitingReaudit',
      label: 'Awaiting re-audit',
      options: [['true', 'Yes']],
      single: true,
    },
  ].filter(Boolean)
}

// Filters for one tab of the lead lists, from the lead coming in to the audit being completed.
function LeadFilters({ tab, filters, onChange, auditors, bdas }) {
  return (
    <FilterBar
      filters={filters}
      onChange={onChange}
      fields={leadFilterFields({ tab, auditors, bdas })}
      shortcuts={LEAD_SHORTCUTS.filter((shortcut) => shortcut.tabs.includes(tab))}
      searchLabel="Search name, email, phone, Zen ID"
    />
  )
}

export default LeadFilters
