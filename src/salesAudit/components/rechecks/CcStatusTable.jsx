import { Chip, Link, Stack, Typography } from '@mui/material'
import {
  CheckCircleRounded as CheckCircleRoundedIcon,
  ScheduleRounded as ScheduleRoundedIcon,
} from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import DataTable from '../common/DataTable'
import MailAlertStatus from '../common/MailAlertStatus'
import { CC_RESPONSES, getCcStatus } from '../../utils/recheckStatus'
import { EMPTY_VALUE, contactName, formatDateTime, orEmpty } from '../../utils/formatters'
import { paths } from '../../utils/routePaths'
import { MUTED_TEXT } from '../../styles/tableSx'

function CcStatusChip({ lead, canEdit, onOpenPending }) {
  if (getCcStatus(lead) === 'completed') {
    return (
      <Chip
        icon={<CheckCircleRoundedIcon />}
        label="Completed"
        size="small"
        color="success"
        component={RouterLink}
        to={paths.ccVerification(lead.id)}
        clickable
      />
    )
  }

  const clickProps = canEdit ? { clickable: true, onClick: () => onOpenPending(lead) } : {}
  return (
    <Chip
      icon={<ScheduleRoundedIcon />}
      label="Pending"
      size="small"
      color="warning"
      {...clickProps}
    />
  )
}

function BdaResponse({ lead }) {
  const { ccResponse } = lead
  if (getCcStatus(lead) === 'completed' || !ccResponse) {
    return <Typography sx={{ fontSize: 13, color: MUTED_TEXT }}>{EMPTY_VALUE}</Typography>
  }

  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" sx={{ fontSize: 13 }}>
        {CC_RESPONSES[ccResponse.response]?.shortLabel ?? ccResponse.response}
        <Typography component="span" sx={{ fontSize: 12, color: MUTED_TEXT, ml: 1 }}>
          {formatDateTime(ccResponse.updatedAt)}
        </Typography>
      </Typography>
      {ccResponse.alert && <MailAlertStatus mail={ccResponse.alert} label="BDA alerted" />}
    </Stack>
  )
}

function getColumns({ canEdit, onOpenPending }) {
  return [
    {
      label: 'Student Name',
      render: (lead) => (
        <Link
          component={RouterLink}
          to={paths.student(lead.id)}
          underline="hover"
          sx={{ fontWeight: 600 }}
        >
          {lead.studentFullName}
        </Link>
      ),
    },
    { label: 'Course', render: (lead) => orEmpty(lead.course) },
    { label: 'BDA', render: (lead) => contactName(lead.saleOwner) },
    { label: 'BDM', render: (lead) => contactName(lead.saleOwnerManager) },
    {
      label: 'CC Status',
      render: (lead) => (
        <CcStatusChip lead={lead} canEdit={canEdit} onOpenPending={onOpenPending} />
      ),
    },
    { label: 'BDA Response', render: (lead) => <BdaResponse lead={lead} /> },
  ]
}

function CcStatusTable({ leads, canEdit, onOpenPending }) {
  return <DataTable columns={getColumns({ canEdit, onOpenPending })} rows={leads} />
}

export default CcStatusTable
