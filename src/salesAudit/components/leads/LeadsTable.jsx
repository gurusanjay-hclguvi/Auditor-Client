import { Button, Link, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import DataTable from '../common/DataTable'
import { AuditStatusChip, CcStatusChip, PaymentReadyChip } from '../common/Chips'
import { MUTED_TEXT } from '../../styles/tableSx'
import { formatCurrency, formatProduct, formatZohoDate } from '../../utils/formatters'
import { paths } from '../../utils/routePaths'
import { isAuditRole, useCanWrite, useCurrentUser } from '../../utils/roles'

// Leads with their audit state. Auditors get Audit (their own leads) and Take up (someone else's).
function LeadsTable({ leads, onTakeUp }) {
  const user = useCurrentUser()
  const canWrite = useCanWrite()
  const auditor = isAuditRole(user.role)
  const columns = [
    {
      label: 'Learner',
      render: (lead) => (
        <Stack>
          <Link
            component={RouterLink}
            to={paths.lead(lead.id)}
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            {lead.personal.name || lead.personal.email}
          </Link>
          <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
            Zen ID {lead.zenId}
          </Typography>
        </Stack>
      ),
    },
    { label: 'Course', render: (lead) => formatProduct(lead.course.product) },
    { label: 'Region', render: (lead) => lead.region || '—' },
    { label: 'Auditor', render: (lead) => lead.assignment?.auditorEmail || '—' },
    { label: 'BDA', render: (lead) => lead.bdaEmail || '—' },
    {
      label: 'Payment',
      render: (lead) => (
        <Stack alignItems="flex-start" gap={0.5}>
          <PaymentReadyChip payment={lead.payment} />
          <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
            {lead.payment.paymentType} · {formatCurrency(lead.payment.courseFee)}
          </Typography>
        </Stack>
      ),
    },
    { label: 'CC', render: (lead) => <CcStatusChip status={lead.cc.status} /> },
    { label: 'Audit', render: (lead) => <AuditStatusChip status={lead.audit.status} /> },
    {
      label: 'Rechecks',
      render: (lead) =>
        lead.recheckSummary.total
          ? `${lead.recheckSummary.open} open / ${lead.recheckSummary.total}`
          : '—',
    },
    { label: 'Enrolled', render: (lead) => formatZohoDate(lead.course.enrolledOn) },
    ...(auditor
      ? [
          {
            label: 'Actions',
            render: (lead) => {
              const mine = lead.assignment?.auditorEmail === user.email || user.role === 'auditorTl'
              return (
                <Stack direction="row" gap={1}>
                  {mine && lead.audit.status !== 'completed' && (
                    <Button
                      size="small"
                      variant="contained"
                      component={RouterLink}
                      to={paths.leadAudit(lead.id)}
                    >
                      {lead.audit.status === 'recheckClosed' ? 'Audit again' : 'Audit'}
                    </Button>
                  )}
                  {!mine &&
                    canWrite &&
                    user.role === 'auditor' &&
                    lead.audit.status !== 'completed' && (
                      <Button size="small" variant="outlined" onClick={() => onTakeUp(lead)}>
                        Take up
                      </Button>
                    )}
                </Stack>
              )
            },
          },
        ]
      : []),
  ]
  return <DataTable columns={columns} rows={leads} storageKey="leads" />
}

export default LeadsTable
