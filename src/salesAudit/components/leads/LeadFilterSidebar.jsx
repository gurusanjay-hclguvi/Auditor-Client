import { useState } from 'react'
import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  ListSubheader,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { CloseRounded as CloseIcon, FilterList as FilterListIcon } from '@mui/icons-material'
import { MUTED_TEXT } from '../../styles/tableSx'
import { OPERATORS, isComplete, operatorOf } from '../../utils/leadFilters'

// The lead lists' filters: a search box and a Filters button, nothing else. The button opens a
// drawer with one block per column: tick it, pick an operator (which depend on the column's kind:
// text, list, number or date) and enter the value. Changes are a draft until Apply.
// rules: [{ field, op, value, value2 }]; suggestions: { auditors, bdas } lists for text fields.
function LeadFilterSidebar({ fields, rules, onRulesChange, search, onSearchChange, suggestions }) {
  const [open, setOpen] = useState(false)

  return (
    <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center" sx={{ mb: 2 }}>
      <TextField
        key={search}
        size="small"
        label="Search name, email, phone, Zen ID"
        placeholder="Press Enter to search"
        defaultValue={search}
        onBlur={(event) => event.target.value !== search && onSearchChange(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && onSearchChange(event.target.value)}
        sx={{ minWidth: 300 }}
      />
      <Badge badgeContent={rules.length} color="primary">
        <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => setOpen(true)}>
          Filters
        </Button>
      </Badge>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 600 } } }}
      >
        {/* Mounted only while open, so each opening starts from the applied rules. */}
        {open && (
          <FilterForm
            fields={fields}
            rules={rules}
            suggestions={suggestions}
            onApply={onRulesChange}
            onClose={() => setOpen(false)}
          />
        )}
      </Drawer>
    </Stack>
  )
}

const blankBlock = (field) => ({
  enabled: false,
  op: OPERATORS[field.kind][0].value,
  value: '',
  value2: '',
})

function initialDraft(fields, rules) {
  return Object.fromEntries(
    fields.map((field) => {
      const rule = rules.find((item) => item.field === field.key)
      const block = rule
        ? { enabled: true, op: rule.op, value: rule.value ?? '', value2: rule.value2 ?? '' }
        : blankBlock(field)
      return [field.key, block]
    }),
  )
}

// A value's display text: an enum's labels, or the values as entered.
function describe(field, block) {
  const operator = operatorOf(field.kind, block.op)
  if (operator.values === 0) return operator.label
  const labelOf = (value) => field.options?.find(([key]) => key === value)?.[1] ?? value
  const values = block.value.split(',').filter(Boolean).map(labelOf).join(', ')
  return operator.values === 2
    ? `${operator.label} ${block.value} – ${block.value2}`
    : `${operator.label} ${values}`
}

function FilterForm({ fields, rules, suggestions, onApply, onClose }) {
  const [draft, setDraft] = useState(() => initialDraft(fields, rules))
  const [find, setFind] = useState('')
  const setBlock = (key, changes) => setDraft({ ...draft, [key]: { ...draft[key], ...changes } })
  const ruleOf = (field) => ({ field: field.key, ...draft[field.key] })
  const enabled = fields.filter((field) => draft[field.key].enabled)
  const incomplete = enabled.filter((field) => !isComplete(ruleOf(field)))
  const term = find.trim().toLowerCase()
  const shown = term ? fields.filter((field) => field.label.toLowerCase().includes(term)) : fields

  function apply() {
    onApply(
      enabled.map((field) => {
        const { op, value, value2 } = draft[field.key]
        const { values } = operatorOf(field.kind, op)
        return {
          field: field.key,
          op,
          ...(values > 0 && { value }),
          ...(values > 1 && { value2 }),
        }
      }),
    )
    onClose()
  }

  return (
    <Stack sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" sx={{ px: 3, py: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Filters
          </Typography>
          <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
            {enabled.length ? `${enabled.length} active` : 'Tick a column to filter on it'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close filters">
          <CloseIcon />
        </IconButton>
      </Stack>
      {enabled.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ px: 3, pb: 2 }}>
          {enabled.map((field) => (
            <Chip
              key={field.key}
              size="small"
              label={`${field.label}: ${describe(field, draft[field.key])}`}
              onDelete={() => setBlock(field.key, blankBlock(field))}
            />
          ))}
        </Stack>
      )}
      <Box sx={{ px: 3, pb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Find a column"
          value={find}
          onChange={(event) => setFind(event.target.value)}
          inputProps={{ 'aria-label': 'Find a column' }}
        />
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3 }}>
        {shown.map((field) => (
          <FilterBlock
            key={field.key}
            field={field}
            block={draft[field.key]}
            suggestions={field.suggest ? (suggestions?.[field.suggest] ?? []) : []}
            onChange={(changes) => setBlock(field.key, changes)}
          />
        ))}
        {shown.length === 0 && (
          <Typography variant="body2" sx={{ color: MUTED_TEXT, py: 2 }}>
            No column matches.
          </Typography>
        )}
      </Box>
      <Divider />
      {incomplete.length > 0 && (
        <Typography variant="caption" color="error" sx={{ px: 3, pt: 1.5 }}>
          Enter a value for {incomplete.map((field) => field.label).join(', ')}.
        </Typography>
      )}
      <Stack direction="row" gap={1.5} sx={{ px: 3, py: 2 }}>
        <Button fullWidth variant="outlined" onClick={() => setDraft(initialDraft(fields, []))}>
          Clear all
        </Button>
        <Button fullWidth variant="contained" onClick={apply} disabled={incomplete.length > 0}>
          Apply
        </Button>
      </Stack>
    </Stack>
  )
}

// The operator list, with the date operators' Day / Week / Month / Year headings.
function operatorItems(kind) {
  return OPERATORS[kind].flatMap((item) => [
    ...(item.group
      ? [<ListSubheader key={`group-${item.group}`}>{item.group}</ListSubheader>]
      : []),
    <MenuItem key={item.value} value={item.value}>
      {item.label}
    </MenuItem>,
  ])
}

function FilterBlock({ field, block, suggestions, onChange }) {
  const operator = operatorOf(field.kind, block.op)

  return (
    <Box sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={block.enabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
        }
        label={<Typography sx={{ fontSize: 16, fontWeight: 700 }}>{field.label}</Typography>}
      />
      <Collapse in={block.enabled} unmountOnExit>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ pt: 1, pb: 1 }}>
          <TextField
            select
            size="small"
            label="Operator"
            value={operator.value}
            onChange={(event) => onChange({ op: event.target.value })}
            sx={{ minWidth: 170 }}
          >
            {operatorItems(field.kind)}
          </TextField>
          {operator.values > 0 && (
            <ValueInput
              field={field}
              value={block.value}
              suggestions={suggestions}
              onChange={(value) => onChange({ value })}
              label={operator.values === 2 ? 'From' : 'Value'}
            />
          )}
          {operator.values > 1 && (
            <ValueInput
              field={field}
              value={block.value2}
              suggestions={suggestions}
              onChange={(value2) => onChange({ value2 })}
              label="To"
            />
          )}
        </Stack>
      </Collapse>
    </Box>
  )
}

// The value box for a field's kind: a date, a number, a pick list (several allowed) or text,
// with suggestions when there are some.
function ValueInput({ field, value, suggestions, onChange, label }) {
  const common = { size: 'small', label, sx: { flex: 1, minWidth: 160 } }
  if (field.kind === 'date') {
    return (
      <TextField
        {...common}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        InputLabelProps={{ shrink: true }}
      />
    )
  }
  if (field.kind === 'number') {
    return (
      <TextField
        {...common}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputProps={{ min: 0, step: 1 }}
      />
    )
  }
  if (field.kind === 'enum') {
    const selected = value ? value.split(',') : []
    return (
      <TextField
        {...common}
        select
        value={selected}
        onChange={(event) => onChange([].concat(event.target.value).filter(Boolean).join(','))}
        SelectProps={{
          multiple: true,
          renderValue: (keys) =>
            keys
              .map((key) => field.options.find(([option]) => option === key)?.[1] ?? key)
              .join(', '),
        }}
      >
        {field.options.map(([key, optionLabel]) => (
          <MenuItem key={key} value={key}>
            <Checkbox size="small" checked={selected.includes(key)} sx={{ p: 0.5, mr: 1 }} />
            {optionLabel}
          </MenuItem>
        ))}
      </TextField>
    )
  }
  if (suggestions.length) {
    return (
      <Autocomplete
        freeSolo
        options={suggestions}
        inputValue={value}
        onInputChange={(_, next) => onChange(next)}
        sx={common.sx}
        renderInput={(params) => <TextField {...params} size="small" label={label} />}
      />
    )
  }
  return <TextField {...common} value={value} onChange={(event) => onChange(event.target.value)} />
}

export default LeadFilterSidebar
