import { Box, Button, Chip, CircularProgress, Link, Stack, Typography } from '@mui/material'
import { TaskAltRounded as TaskAltRoundedIcon } from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import DataTable from '../common/DataTable'
import MailAlertStatus from '../common/MailAlertStatus'
import {
  RECHECK_CATEGORIES,
  RECHECK_STATUS,
  getCategoryLabel,
  getRecheckCategories,
} from '../../utils/recheckStatus'
import { EMPTY_VALUE, contactName, formatDateTime } from '../../utils/formatters'
import { paths } from '../../utils/routePaths'

function getColumns({ canEdit, resolvingId, onResolve }) {
  const columns = [
    { label: 'Raised On', render: (row) => formatDateTime(row.raisedAt) },
    {
      label: 'Student Name',
      render: (row) =>
        row.lead ? (
          <Link
            component={RouterLink}
            to={paths.student(row.leadId)}
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            {row.lead.studentFullName}
          </Link>
        ) : (
          row.leadId
        ),
    },
    {
      label: 'Categories',
      render: (row) => (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, minWidth: 140 }}>
          {getRecheckCategories(row).map((key) => (
            <Chip
              key={key}
              label={getCategoryLabel(key)}
              size="small"
              color={RECHECK_CATEGORIES[key]?.color ?? 'default'}
              variant="outlined"
            />
          ))}
        </Stack>
      ),
    },
    {
      label: 'Issue',
      render: (row) => (
        <Box sx={{ minWidth: 260, maxWidth: 420, whiteSpace: 'normal' }}>{row.notes}</Box>
      ),
    },
    {
      label: 'SR ID · Attempt',
      render: (row) =>
        row.srId ? `${row.srId}${row.attempt ? ` · #${row.attempt}` : ''}` : EMPTY_VALUE,
    },
    { label: 'Raised By', render: (row) => row.raisedBy || EMPTY_VALUE },
    { label: 'BDA', render: (row) => contactName(row.lead?.saleOwner) },
    { label: 'BDM', render: (row) => contactName(row.lead?.saleOwnerManager) },
    {
      label: 'Alert',
      render: (row) =>
        row.alert ? (
          <Stack spacing={0.5}>
            <MailAlertStatus mail={row.alert} label="Alerted BDA & BDM" />
            {row.lastReminder && (
              <MailAlertStatus mail={row.lastReminder} label="Reminded (open >24h)" />
            )}
          </Stack>
        ) : (
          EMPTY_VALUE
        ),
    },
    {
      label: 'Status',
      render: (row) => {
        const status = RECHECK_STATUS[row.status]
        return (
          <Chip
            label={
              row.status === 'resolved' && row.resolvedAt
                ? `${status.label} · ${formatDateTime(row.resolvedAt)}`
                : status.label
            }
            size="small"
            color={status.color}
          />
        )
      },
    },
  ]

  if (!canEdit) return columns
  return [
    ...columns,
    {
      label: 'Action',
      render: (row) =>
        row.status === 'open' && row.source === 'zoho' ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Close the ticket in Zoho
          </Typography>
        ) : row.status === 'open' ? (
          <Button
            size="small"
            disabled={resolvingId === row.id}
            startIcon={
              resolvingId === row.id ? <CircularProgress size={14} /> : <TaskAltRoundedIcon />
            }
            onClick={() => onResolve(row.id)}
          >
            Mark resolved
          </Button>
        ) : (
          EMPTY_VALUE
        ),
    },
  ]
}

// rows: rechecks joined with their lead summary as `lead`.
function RechecksTable({ rows, canEdit, resolvingId, onResolve }) {
  return <DataTable columns={getColumns({ canEdit, resolvingId, onResolve })} rows={rows} />
}

export default RechecksTable
