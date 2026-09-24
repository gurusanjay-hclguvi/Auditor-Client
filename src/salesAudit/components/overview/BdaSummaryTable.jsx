import { Typography } from '@mui/material'
import DataTable from '../common/DataTable'
import { RESPONSE_TARGET_HOURS } from '../../utils/auditHistory'
import { EMPTY_VALUE, formatDuration } from '../../utils/formatters'
import { MUTED_TEXT } from '../../styles/tableSx'

const TARGET_S = RESPONSE_TARGET_HOURS * 60 * 60

function Count({ value, alert }) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontSize: 13,
        fontWeight: value && alert ? 700 : 400,
        color: value ? (alert ? 'error.main' : 'text.primary') : MUTED_TEXT,
      }}
    >
      {value}
    </Typography>
  )
}

function getColumns(periodLabel) {
  return [
    {
      label: 'BDA',
      render: (row) => (
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.bda.name}</Typography>
      ),
    },
    { label: 'BDM', render: (row) => row.bdmName || EMPTY_VALUE },
    { label: 'Leads', render: (row) => row.leadCount },
    { label: 'Open rechecks', render: (row) => <Count value={row.openRechecks} alert /> },
    {
      label: `vs ${periodLabel}`,
      render: (row) =>
        row.openRechecksDelta === 0
          ? 'No change'
          : `${row.openRechecksDelta > 0 ? '▲' : '▼'} ${Math.abs(row.openRechecksDelta)} · ${
              row.openRechecksDelta > 0 ? 'worse' : 'better'
            }`,
    },
    {
      label: 'Payments >24h unverified',
      render: (row) => <Count value={row.overduePayments} alert />,
    },
    { label: 'CCs to update', render: (row) => <Count value={row.ccToUpdate} alert /> },
    {
      label: 'Median recheck resolution',
      render: (row) =>
        row.medianResolutionS == null ? (
          EMPTY_VALUE
        ) : (
          <Typography
            variant="body2"
            sx={{
              fontSize: 13,
              color: row.medianResolutionS > TARGET_S ? 'error.main' : 'text.primary',
            }}
          >
            {formatDuration(row.medianResolutionS * 1000)}
            {row.medianResolutionS > TARGET_S ? ' · over target' : ''}
          </Typography>
        ),
    },
  ]
}

// One row per BDA, most open issues first: who to follow up with.
function BdaSummaryTable({ rows, periodLabel }) {
  return <DataTable columns={getColumns(periodLabel)} rows={rows} />
}

export default BdaSummaryTable
