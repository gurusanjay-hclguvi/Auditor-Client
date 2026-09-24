import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListSubheader,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { CloseRounded as CloseRoundedIcon, SearchRounded as SearchRoundedIcon } from '@mui/icons-material'
import { FILTER_FIELDS, getOperator, getOperators, isComplete } from '../../utils/leadFilters'
import { MUTED_TEXT } from '../../styles/tableSx'

// Condition dropdown items; date conditions with a `group` sit under Day / Week / Month / Year.
function operatorItems(type) {
  const items = []
  let group = null
  getOperators(type).forEach((operator) => {
    if (operator.group && operator.group !== group) {
      group = operator.group
      items.push(<ListSubheader key={`group-${group}`}>{group}</ListSubheader>)
    }
    items.push(
      <MenuItem key={operator.key} value={operator.key} sx={operator.group ? { pl: 3 } : undefined}>
        {operator.label}
      </MenuItem>,
    )
  })
  return items
}

// One row per field: checkbox + name, then its own condition dropdown and value input(s).
function FieldFilter({ field, row, onChange }) {
  const operator = getOperator(field.type, row.operator)
  const valueType = field.type === 'date' ? 'date' : 'text'
  // Picking a condition or typing a value turns the filter on.
  const set = (patch) => onChange({ ...row, enabled: true, ...patch })

  return (
    <Box sx={{ py: 1.25 }}>
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={row.enabled}
            onChange={(event) => onChange({ ...row, enabled: event.target.checked })}
          />
        }
        label={
          <Typography variant="body2" sx={{ fontWeight: row.enabled ? 700 : 500 }}>
            {field.label}
          </Typography>
        }
        sx={{ mr: 0 }}
      />
      <Stack direction="row" spacing={1} sx={{ pl: 3.5, mt: 0.5 }}>
        <TextField
          select
          size="small"
          label="Condition"
          value={row.operator}
          onChange={(event) => set({ operator: event.target.value })}
          sx={{ width: 170, flexShrink: 0 }}
          SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 360 } } } }}
        >
          {operatorItems(field.type)}
        </TextField>
        {operator?.inputs === 0 ? (
          <Typography variant="caption" sx={{ color: MUTED_TEXT, alignSelf: 'center' }}>
            No value needed
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            <TextField
              size="small"
              type={valueType}
              label={operator?.inputs === 2 ? 'From' : 'Value'}
              value={row.value}
              onChange={(event) => set({ value: event.target.value })}
              InputLabelProps={valueType === 'date' ? { shrink: true } : undefined}
              fullWidth
            />
            {operator?.inputs === 2 && (
              <TextField
                size="small"
                type={valueType}
                label="To"
                value={row.valueTo}
                onChange={(event) => set({ valueTo: event.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

const emptyRow = (field) => ({
  id: field.key,
  field: field.key,
  enabled: false,
  operator: getOperators(field.type)[0].key,
  value: '',
  valueTo: '',
})

// Right-hand sidebar listing every filterable field. Tick the fields to filter on (any number);
// a lead must match every ticked filter. Edits are a draft until "Apply".
function LeadFilterDrawer({ open, filters, onClose, onApply }) {
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      FILTER_FIELDS.map((field) => {
        const applied = filters.find((filter) => filter.field === field.key)
        return [field.key, applied ? { ...emptyRow(field), ...applied, enabled: true } : emptyRow(field)]
      }),
    ),
  )
  const [search, setSearch] = useState('')

  const visibleFields = useMemo(
    () =>
      FILTER_FIELDS.filter((field) => field.label.toLowerCase().includes(search.trim().toLowerCase())),
    [search],
  )
  const selected = Object.values(rows).filter((row) => row.enabled && isComplete(row))
  const ticked = Object.values(rows).filter((row) => row.enabled).length

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, pb: 1 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Filter leads
            </Typography>
            <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
              Tick the fields to filter on; a lead must match every ticked filter
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close filters">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
        <Box sx={{ px: 2, pb: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Find a field"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Divider />

        <Box sx={{ px: 2, flex: 1, overflowY: 'auto' }}>
          {visibleFields.map((field, index) => (
            <Box key={field.key}>
              {index > 0 && <Divider />}
              <FieldFilter
                field={field}
                row={rows[field.key]}
                onChange={(next) => setRows((current) => ({ ...current, [field.key]: next }))}
              />
            </Box>
          ))}
          {visibleFields.length === 0 && (
            <Typography variant="body2" sx={{ color: MUTED_TEXT, py: 3, textAlign: 'center' }}>
              No field matches “{search}”.
            </Typography>
          )}
        </Box>

        <Divider />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2 }}>
          <Typography variant="caption" sx={{ color: MUTED_TEXT, flex: 1 }}>
            {ticked === selected.length
              ? `${selected.length} selected`
              : `${selected.length} of ${ticked} ticked ready (fill in their values)`}
          </Typography>
          <Button
            onClick={() => {
              setRows(Object.fromEntries(FILTER_FIELDS.map((field) => [field.key, emptyRow(field)])))
              onApply([])
            }}
          >
            Clear all
          </Button>
          <Button
            variant="contained"
            onClick={() =>
              onApply(selected.map((row) => ({
                id: row.id,
                field: row.field,
                operator: row.operator,
                value: row.value,
                valueTo: row.valueTo,
              })))
            }
          >
            Apply{selected.length ? ` (${selected.length})` : ''}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}

export default LeadFilterDrawer
