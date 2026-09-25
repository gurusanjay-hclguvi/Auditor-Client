import { useState } from 'react'
import { Badge, Button, Chip, Stack, TextField } from '@mui/material'
import { FilterList as FilterListIcon } from '@mui/icons-material'
import FilterDrawer from './FilterDrawer'

// A shortcut is on when every filter it sets, and no other filter, is set.
function shortcutOn(filters, shortcut, keys) {
  return keys.every((key) => (filters[key] ?? '') === (shortcut.filters[key] ?? ''))
}

// Filters above a list: shortcut chips for common questions, a search box, and a Filters button
// that opens every other filter in a drawer on the right (see FilterDrawer for `fields`). The
// applied filters show as chips that can be removed one by one.
// filters / onChange carry only these filters ({ search, [field.key]: "a,b" }).
function FilterBar({ filters, onChange, fields, shortcuts = [], searchLabel }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const set = (key) => (value) => onChange({ ...filters, [key]: value })
  const keys = ['search', ...fields.map((field) => field.key)]
  const applied = fields.filter((field) => filters[field.key])
  const active = keys.some((key) => filters[key])

  return (
    <Stack gap={2} sx={{ mb: 2 }}>
      {shortcuts.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {shortcuts.map((shortcut) => {
            const on = shortcutOn(filters, shortcut, keys)
            return (
              <Chip
                key={shortcut.label}
                label={shortcut.label}
                clickable
                color={on ? 'primary' : 'default'}
                variant={on ? 'filled' : 'outlined'}
                onClick={() => onChange(on ? {} : shortcut.filters)}
              />
            )
          })}
        </Stack>
      )}
      <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
        <TextField
          key={filters.search ?? ''}
          size="small"
          label={searchLabel}
          placeholder="Press Enter to search"
          defaultValue={filters.search ?? ''}
          onBlur={(event) =>
            event.target.value !== (filters.search ?? '') && set('search')(event.target.value)
          }
          onKeyDown={(event) => event.key === 'Enter' && set('search')(event.target.value)}
          sx={{ minWidth: 300 }}
        />
        <Badge badgeContent={applied.length} color="primary">
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setDrawerOpen(true)}
          >
            Filters
          </Button>
        </Badge>
        {applied.map((field) => {
          const names = filters[field.key]
            .split(',')
            .map((value) => field.options.find(([option]) => option === value)?.[1] ?? value)
          return (
            <Chip
              key={field.key}
              size="small"
              label={`${field.label}: ${names.join(', ')}`}
              onDelete={() => set(field.key)('')}
            />
          )
        })}
        {active && <Button onClick={() => onChange({})}>Clear filters</Button>}
      </Stack>
      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        fields={fields}
        values={filters}
        onApply={(draft) => onChange({ ...filters, ...draft })}
      />
    </Stack>
  )
}

export default FilterBar
