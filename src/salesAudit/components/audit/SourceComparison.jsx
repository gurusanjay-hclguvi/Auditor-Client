import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { ReportGmailerrorredRounded as ReportIcon } from '@mui/icons-material'
import DataTable from '../common/DataTable'
import { recheckForRow } from '../../utils/auditChecks'
import { EMPTY_VALUE } from '../../utils/formatters'
import { MUTED_TEXT } from '../../styles/tableSx'

const normalize = (value) => value.toLowerCase().replace(/[\s,]/g, '')

function StatusChip({ row, sourceList }) {
  if (row.status === 'match') {
    return <Chip label="Match" size="small" color="success" variant="outlined" />
  }
  if (row.status === 'mismatch') return <Chip label="Mismatch" size="small" color="error" />
  if (row.status === 'info') return <Chip label="For reference" size="small" variant="outlined" />
  const only = sourceList.find((source) => row.values[source.key])
  return <Chip label={`Only in ${only?.label ?? 'one source'}`} size="small" variant="outlined" />
}

// A value that disagrees with Zoho (or with the first source that has one) is highlighted.
function ValueCell({ row, source, sourceList }) {
  const value = row.values[source.key]
  if (!value) return <Typography sx={{ fontSize: 13, color: MUTED_TEXT }}>{EMPTY_VALUE}</Typography>
  const reference =
    row.values.zoho || row.values[sourceList.find((item) => row.values[item.key])?.key]
  const differs = row.status === 'mismatch' && normalize(value) !== normalize(reference)
  return (
    <Typography
      sx={{
        fontSize: 13,
        fontWeight: differs ? 700 : 400,
        color: differs ? 'error.main' : 'text.primary',
        whiteSpace: 'normal',
        minWidth: 110,
      }}
    >
      {value}
    </Typography>
  )
}

function getColumns({ sourceList, canEdit, onRaise }) {
  const columns = [
    {
      label: 'Field',
      render: (row) => (
        <Typography sx={{ fontSize: 13, fontWeight: 600, minWidth: 150 }}>{row.label}</Typography>
      ),
    },
    ...sourceList.map((source) => ({
      label: source.label,
      render: (row) => <ValueCell row={row} source={source} sourceList={sourceList} />,
    })),
    { label: 'Status', render: (row) => <StatusChip row={row} sourceList={sourceList} /> },
  ]
  if (!canEdit) return columns
  return [
    ...columns,
    {
      label: 'Action',
      render: (row) =>
        row.status === 'mismatch' ? (
          <Button
            size="small"
            color="error"
            startIcon={<ReportIcon />}
            onClick={() => onRaise(recheckForRow(row, sourceList))}
          >
            Raise recheck
          </Button>
        ) : (
          EMPTY_VALUE
        ),
    },
  ]
}

// Zoho vs CC mail vs EMI vendor, one table per section.
function SourceComparison({ sections, sourceList, canEdit, onRaise }) {
  const columns = getColumns({ sourceList, canEdit, onRaise })
  const mismatches = sections
    .flatMap((section) => section.rows)
    .filter((row) => row.status === 'mismatch')

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Source comparison
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {sourceList.map((source) => source.label).join(' · ')}
          </Typography>
        </Box>
        <Chip
          label={
            mismatches.length
              ? `${mismatches.length} mismatch${mismatches.length === 1 ? '' : 'es'}`
              : 'All sources agree'
          }
          color={mismatches.length ? 'error' : 'success'}
        />
      </Stack>
      {sourceList.length === 1 && (
        <Typography variant="body2" sx={{ color: MUTED_TEXT, mb: 2 }}>
          Only Zoho data is available: there is no CC mail or vendor record to compare against yet.
        </Typography>
      )}
      <Stack spacing={2.5}>
        {sections.map((section) => (
          <Box key={section.key}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              {section.title}
            </Typography>
            <DataTable
              columns={columns}
              rows={section.rows.map((row) => ({ ...row, id: row.key }))}
            />
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}

export default SourceComparison
