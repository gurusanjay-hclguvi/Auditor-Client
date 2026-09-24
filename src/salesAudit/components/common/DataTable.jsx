import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { bodyCellSx, headCellSx, tableContainerSx } from '../../styles/tableSx'

// columns: [{ label, render: (row) => node }]; rows must carry a unique `id`.
function DataTable({ columns, rows }) {
  return (
    <TableContainer sx={tableContainerSx}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.label} sx={headCellSx}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              {columns.map((column) => (
                <TableCell key={column.label} sx={bodyCellSx}>
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default DataTable
