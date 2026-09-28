import { Button, Link, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import DataTable from '../common/DataTable'
import { AuditStatusChip, CcStatusChip, PaymentReadyChip, RecheckStatusChip } from '../common/Chips'
import { MUTED_TEXT } from '../../styles/tableSx'
import {
  formatCurrency,
  formatDateTime,
  formatProduct,
  formatZohoDate,
  orEmpty,
} from '../../utils/formatters'
import { categoryLabel, reasonsOf } from '../../utils/labels'
import { paths } from '../../utils/routePaths'
import { isAuditRole, useCanWrite, useCurrentUser } from '../../utils/roles'

// A column from the lead's most recent recheck ("—" when it has none).
const fromRecheck = (read) => (lead) => (lead.latestRecheck ? read(lead.latestRecheck) : '—')

// Columns shown only when picked in the Columns menu. Recheck columns show the latest recheck.
const MORE_COLUMNS = [
  { label: 'SR ID', render: fromRecheck((recheck) => recheck.recheckNo) },
  { label: 'Audit Team Comments', render: fromRecheck((recheck) => orEmpty(recheck.comments)) },
  { label: 'Recheck Category', render: fromRecheck((recheck) => categoryLabel(recheck.category)) },
  {
    label: 'Recheck Reason',
    render: fromRecheck((recheck) =>
      reasonsOf(recheck)
        .map((reason) => categoryLabel(reason.category))
        .join(', '),
    ),
  },
  {
    label: 'Recheck Date Time',
    render: fromRecheck((recheck) => formatDateTime(recheck.raisedAt)),
  },
  {
    label: 'Recheck Request From',
    render: fromRecheck((recheck) => orEmpty(recheck.raisedBy.email)),
  },
  {
    label: 'Ticket Status',
    render: fromRecheck((recheck) => <RecheckStatusChip recheck={recheck} />),
  },
  { label: 'CC Recheck Attempt', render: fromRecheck((recheck) => recheck.attempt || '—') },
  {
    label: 'Resubmit Date Time',
    render: fromRecheck((recheck) => formatDateTime(recheck.closed?.at)),
  },
  {
    label: 'New Confirmation Call Link',
    render: (lead) =>
      lead.cc.link ? (
        <Link href={lead.cc.link} target="_blank" rel="noreferrer" underline="hover">
          Open
        </Link>
      ) : (
        '—'
      ),
  },
  { label: 'Assigned Batch', render: (lead) => orEmpty(lead.course.batch.name) },
  { label: 'Sales From', render: (lead) => orEmpty(lead.salesFrom) },
  {
    label: 'Awaiting Main Bootcamp Date-Time',
    render: (lead) => formatDateTime(lead.course.awaitingAt),
  },
  { label: 'Onboarding Coordinator', render: (lead) => orEmpty(lead.onboardCoordinator) },
  { label: 'Onboarded Date Time', render: (lead) => formatDateTime(lead.course.onboardingAt) },
  {
    label: 'Audit Coordinator Assigned Date-Time',
    render: (lead) => formatDateTime(lead.assignment?.assignedAt),
  },
  { label: 'Audit Completed Date-Time', render: (lead) => formatDateTime(lead.audit.completedAt) },
].map((column) => ({ ...column, defaultHidden: true }))

// Leads with their audit state. Audit coordinators get Audit (their own leads) and Take up
// (someone else's). Each row is a lead of GET /leads, with its latest recheck.
function LeadsTable({ leads, onTakeUp }) {
  const user = useCurrentUser()
  const canWrite = useCanWrite()
  const auditor = isAuditRole(user.role)
  const columns = [
    {
      label: 'Learner',
      render: (lead) => (
        <Link
          component={RouterLink}
          to={paths.lead(lead.id)}
          underline="hover"
          sx={{ fontWeight: 600 }}
        >
          {lead.personal.name || lead.personal.email}
        </Link>
      ),
    },
    { label: 'Zen ID', render: (lead) => orEmpty(lead.zenId) },
    { label: 'Course', render: (lead) => formatProduct(lead.course.product) },
    { label: 'Region', render: (lead) => lead.region || '—' },
    { label: 'Audit Coordinator', render: (lead) => lead.assignment?.auditorEmail || '—' },
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
    ...MORE_COLUMNS,
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
