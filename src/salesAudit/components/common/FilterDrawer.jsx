import { useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { CloseRounded as CloseIcon } from '@mui/icons-material'
import { MUTED_TEXT } from '../../styles/tableSx'

// How the search box matches the option labels.
const OPERATORS = [
  { value: 'contains', label: 'Contains', test: (label, term) => label.includes(term) },
  { value: 'equals', label: 'Equals', test: (label, term) => label === term },
  { value: 'startsWith', label: 'Starts with', test: (label, term) => label.startsWith(term) },
  { value: 'endsWith', label: 'Ends with', test: (label, term) => label.endsWith(term) },
]

// Values travel as comma lists ("North,South"), which the backend reads as "any of".
const splitValues = (value) => (value ? String(value).split(',').filter(Boolean) : [])

// Right-hand drawer with one block per filter: a checkbox that turns the filter on, an operator
// and a search box that narrow the options, and the options as a checklist.
// fields: [{ key, label, options: [[value, label]], single }]; `single` allows one checked option.
// Changes are a draft until Apply, so the list reloads once rather than on every pick.
function FilterDrawer({ open, onClose, fields, values, onApply }) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 600 } } }}
    >
      {/* Mounted only while open, so each opening starts from the applied filters. */}
      {open && <FilterForm fields={fields} values={values} onApply={onApply} onClose={onClose} />}
    </Drawer>
  )
}

function initialBlock(value) {
  const selected = splitValues(value)
  return { enabled: selected.length > 0, operator: 'contains', search: '', selected }
}

function FilterForm({ fields, values, onApply, onClose }) {
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(fields.map((field) => [field.key, initialBlock(values[field.key])])),
  )
  const setBlock = (key, changes) => setDraft({ ...draft, [key]: { ...draft[key], ...changes } })
  const activeCount = fields.filter(
    (field) => draft[field.key].enabled && draft[field.key].selected.length,
  ).length

  function apply() {
    onApply(
      Object.fromEntries(
        fields.map((field) => {
          const block = draft[field.key]
          return [field.key, block.enabled ? block.selected.join(',') : '']
        }),
      ),
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
            {activeCount ? `${activeCount} active` : 'Tick a filter to use it'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close filters">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3 }}>
        {fields.map((field) => (
          <FilterBlock
            key={field.key}
            field={field}
            block={draft[field.key]}
            onChange={(changes) => setBlock(field.key, changes)}
          />
        ))}
      </Box>
      <Divider />
      <Stack direction="row" gap={1.5} sx={{ px: 3, py: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() =>
            setDraft(Object.fromEntries(fields.map((field) => [field.key, initialBlock('')])))
          }
        >
          Reset
        </Button>
        <Button fullWidth variant="contained" onClick={apply}>
          Apply
        </Button>
      </Stack>
    </Stack>
  )
}

function FilterBlock({ field, block, onChange }) {
  const operator = OPERATORS.find((item) => item.value === block.operator)
  const term = block.search.trim().toLowerCase()
  const options = term
    ? field.options.filter(([, label]) => operator.test(String(label).toLowerCase(), term))
    : field.options

  function toggle(value) {
    const checked = block.selected.includes(value)
    const selected = checked
      ? block.selected.filter((item) => item !== value)
      : field.single
        ? [value]
        : [...block.selected, value]
    onChange({ selected })
  }

  return (
    <Box sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={block.enabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
        }
        label={
          <Stack direction="row" alignItems="baseline" gap={1}>
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{field.label}</Typography>
            {block.selected.length > 0 && (
              <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
                {block.selected.length} selected
              </Typography>
            )}
          </Stack>
        }
      />
      <Collapse in={block.enabled} unmountOnExit>
        <Stack gap={2} sx={{ pt: 2 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Operator"
            value={block.operator}
            onChange={(event) => onChange({ operator: event.target.value })}
          >
            {OPERATORS.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            size="small"
            placeholder="Search"
            value={block.search}
            onChange={(event) => onChange({ search: event.target.value })}
            inputProps={{ 'aria-label': `Search ${field.label}` }}
          />
          <Box
            sx={{
              maxHeight: 240,
              overflowY: 'auto',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            {options.length === 0 ? (
              <Typography variant="body2" sx={{ color: MUTED_TEXT, px: 2, py: 1.5 }}>
                No options match.
              </Typography>
            ) : (
              options.map(([value, label]) => (
                <FormControlLabel
                  key={value}
                  control={
                    <Checkbox
                      size="small"
                      checked={block.selected.includes(value)}
                      onChange={() => toggle(value)}
                    />
                  }
                  label={<Typography sx={{ fontSize: 16 }}>{label}</Typography>}
                  sx={{
                    display: 'flex',
                    m: 0,
                    px: 1,
                    minHeight: 44,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                />
              ))
            )}
          </Box>
          {field.single && (
            <Typography variant="caption" sx={{ color: MUTED_TEXT, mt: -1 }}>
              Pick one.
            </Typography>
          )}
        </Stack>
      </Collapse>
    </Box>
  )
}

export default FilterDrawer
