import { Button, Chip, MenuItem, Stack, TextField } from '@mui/material'
import {
  AUDIT_STATUS,
  CC_STATUS,
  DATE_PRESETS,
  RECHECK_CATEGORIES,
  REGIONS,
} from '../../utils/labels'
import { FILTER_KEYS, LEAD_SHORTCUTS, shortcutMatches as matches } from '../../utils/leadFilters'

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

const presetOptions = DATE_PRESETS.map((preset) => [preset.value, preset.label])

// Filters for the lead lists, from the lead coming in to the audit being completed.
function LeadFilters({ filters, onChange, auditors, bdas }) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value })
  const active = FILTER_KEYS.some((key) => filters[key])
  return (
    <Stack gap={2} sx={{ mb: 2 }}>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {LEAD_SHORTCUTS.map((shortcut) => (
          <Chip
            key={shortcut.label}
            label={shortcut.label}
            clickable
            color={matches(filters, shortcut) ? 'primary' : 'default'}
            variant={matches(filters, shortcut) ? 'filled' : 'outlined'}
            onClick={() => onChange(matches(filters, shortcut) ? {} : shortcut.filters)}
          />
        ))}
      </Stack>
      <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
        <TextField
          key={filters.search ?? ''}
          size="small"
          label="Search name, email, phone, Zen ID"
          defaultValue={filters.search ?? ''}
          onBlur={(event) =>
            event.target.value !== (filters.search ?? '') && set('search')(event.target.value)
          }
          onKeyDown={(event) => event.key === 'Enter' && set('search')(event.target.value)}
          helperText="Press Enter to search"
          sx={{ minWidth: 260 }}
        />
        <Select
          label="Audit status"
          value={filters.auditStatus}
          onChange={set('auditStatus')}
          options={Object.entries(AUDIT_STATUS).map(([key, { label }]) => [key, label])}
          width={200}
        />
        <Select
          label="Region"
          value={filters.region}
          onChange={set('region')}
          options={REGIONS.map((region) => [region, region])}
          width={120}
        />
        {auditors && (
          <Select
            label="Auditor"
            value={filters.auditorEmail}
            onChange={set('auditorEmail')}
            options={auditors.map((auditor) => [auditor.email, auditor.name])}
          />
        )}
        {bdas && (
          <Select
            label="BDA"
            value={filters.bdaEmail}
            onChange={set('bdaEmail')}
            options={bdas.map((bda) => [bda, bda])}
            width={220}
          />
        )}
        <Select
          label="CC status"
          value={filters.ccStatus}
          onChange={set('ccStatus')}
          options={Object.entries(CC_STATUS).map(([key, { label }]) => [key, label])}
          width={140}
        />
        <Select
          label="Recheck category"
          value={filters.recheckCategory}
          onChange={set('recheckCategory')}
          options={Object.entries(RECHECK_CATEGORIES)}
        />
        <Select
          label="Recheck raised"
          value={filters.recheckRaisedIn}
          onChange={set('recheckRaisedIn')}
          options={presetOptions}
          width={150}
        />
        <Select
          label="Recheck closed"
          value={filters.recheckClosedIn}
          onChange={set('recheckClosedIn')}
          options={presetOptions}
          width={150}
        />
        <Select
          label="Audit completed"
          value={filters.completedIn}
          onChange={set('completedIn')}
          options={presetOptions}
          width={150}
        />
        {active && <Button onClick={() => onChange({})}>Clear filters</Button>}
      </Stack>
    </Stack>
  )
}

export default LeadFilters
