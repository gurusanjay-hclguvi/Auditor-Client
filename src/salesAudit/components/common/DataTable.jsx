import { useState } from 'react'
import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import ColumnPicker from './ColumnPicker'
import { bodyCellSx, headCellSx, tableContainerSx } from '../../styles/tableSx'

// The columns picked in the Columns menu are remembered per table (`storageKey`) in this browser:
// the ones hidden, and the default-hidden ones shown. A table without a key forgets them on
// reload. Storage can be blocked, so every access is guarded.
const storageName = (storageKey) => `salesAuditHiddenColumns:${storageKey}`
const NO_CHOICE = { hidden: [], shown: [] }

function loadChoice(storageKey) {
  if (!storageKey) return NO_CHOICE
  try {
    const saved = JSON.parse(localStorage.getItem(storageName(storageKey)))
    // Saved before columns could be hidden by default: a list of hidden labels.
    if (Array.isArray(saved)) return { hidden: saved, shown: [] }
    return {
      hidden: Array.isArray(saved?.hidden) ? saved.hidden : [],
      shown: Array.isArray(saved?.shown) ? saved.shown : [],
    }
  } catch {
    return NO_CHOICE
  }
}

function saveChoice(storageKey, choice) {
  if (!storageKey) return
  try {
    localStorage.setItem(storageName(storageKey), JSON.stringify(choice))
  } catch {
    // Storage blocked: the choice lasts until reload.
  }
}

// columns: [{ label, render: (row) => node, defaultHidden }]; rows must carry a unique `id`. The
// Columns menu at the top right shows or hides columns; `defaultHidden` ones start hidden. The
// first column always stays so each row is identifiable.
function DataTable({ columns, rows, storageKey }) {
  const [choice, setChoice] = useState(() => loadChoice(storageKey))
  const labels = columns.map((column) => column.label)
  const locked = labels.slice(0, 1)
  const hiddenNow = columns
    .filter(
      (column) =>
        !locked.includes(column.label) &&
        (choice.hidden.includes(column.label) ||
          (column.defaultHidden && !choice.shown.includes(column.label))),
    )
    .map((column) => column.label)
  const visible = columns.filter((column) => !hiddenNow.includes(column.label))

  function update(hidden) {
    const shown = labels.filter((label) => !hidden.includes(label))
    const next = { hidden, shown }
    setChoice(next)
    saveChoice(storageKey, next)
  }

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
        <ColumnPicker
          labels={labels}
          locked={locked}
          hidden={hiddenNow}
          onToggle={(label) =>
            update(
              hiddenNow.includes(label)
                ? hiddenNow.filter((item) => item !== label)
                : [...hiddenNow, label],
            )
          }
          onShowAll={() => update([])}
          onHideAll={() => update(labels.filter((label) => !locked.includes(label)))}
        />
      </Stack>
      <TableContainer sx={tableContainerSx}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {visible.map((column) => (
                <TableCell key={column.label} sx={headCellSx}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                {visible.map((column) => (
                  <TableCell key={column.label} sx={bodyCellSx}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

export default DataTable
