import { Button, Chip, Paper, Typography } from '@mui/material'
import DataTable from '../common/DataTable'

function getColumns(onSelect) {
  return [
    {
      label: 'BDA',
      render: (row) => <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.name}</Typography>,
    },
    { label: 'Leads', render: (row) => row.leads },
    {
      label: 'To do',
      render: (row) =>
        row.urgent ? (
          <Chip label={`${row.todo} · ${row.urgent} urgent`} size="small" color="error" />
        ) : (
          row.todo
        ),
    },
    { label: 'Open rechecks', render: (row) => row.openRechecks },
    { label: 'CCs pending', render: (row) => row.pendingCc },
    {
      label: 'Action',
      render: (row) => (
        <Button size="small" onClick={() => onSelect(row.email)}>
          View BDA
        </Button>
      ),
    },
  ]
}

// The BDM's Home view: one row per BDA under them (see getTeamSummary).
function TeamSummary({ rows, onSelect }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Your BDAs
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Everything below adds up all of them; pick one to see just their leads
      </Typography>
      <DataTable columns={getColumns(onSelect)} rows={rows.map((row) => ({ ...row, id: row.email }))} />
    </Paper>
  )
}

export default TeamSummary
