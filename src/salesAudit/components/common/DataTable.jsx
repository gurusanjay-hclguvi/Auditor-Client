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

// Hidden columns are remembered per table (`storageKey`) in this browser; a table without a key
// forgets them on reload. Storage can be blocked, so every access is guarded.
const storageName = (storageKey) => `salesAuditHiddenColumns:${storageKey}`

function loadHidden(storageKey) {
  if (!storageKey) return []
  try {
    const saved = JSON.parse(localStorage.getItem(storageName(storageKey)))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function saveHidden(storageKey, hidden) {
  if (!storageKey) return
  try {
    localStorage.setItem(storageName(storageKey), JSON.stringify(hidden))
  } catch {
    // Storage blocked: the choice lasts until reload.
  }
}

// columns: [{ label, render: (row) => node }]; rows must carry a unique `id`. The Columns menu at
// the top right shows or hides columns; the first column always stays so each row is identifiable.
function DataTable({ columns, rows, storageKey }) {
  const [hidden, setHidden] = useState(() => loadHidden(storageKey))
  const labels = columns.map((column) => column.label)
  const locked = labels.slice(0, 1)
  const hiddenNow = hidden.filter((label) => labels.includes(label) && !locked.includes(label))
  const visible = columns.filter((column) => !hiddenNow.includes(column.label))

  function update(next) {
    setHidden(next)
    saveHidden(storageKey, next)
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
