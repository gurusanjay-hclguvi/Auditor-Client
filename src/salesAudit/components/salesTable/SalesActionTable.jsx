import { useMemo } from 'react'
import { Box, Button, Link, Tooltip, Typography } from '@mui/material'
import { FactCheckOutlined as FactCheckOutlinedIcon } from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import DataTable from '../common/DataTable'
import ColumnPicker from '../common/ColumnPicker'
import { useColumnVisibility } from '../../utils/useColumnVisibility'
import YesNoCell from '../common/YesNoCell'
import DiscountStatusCell from '../common/DiscountStatusCell'
import CreditStatusCell from '../leads/CreditStatusCell'
import EscalationCell from '../leads/EscalationCell'
import { getSalesFlags } from '../../utils/salesFlags'
import {
  LEAD_STAGES,
  getLeadStage,
  getPendingReason,
  getSapAgeMs,
  isSapOverdue,
} from '../../utils/leadStatus'
import { EMPTY_VALUE, formatCurrency, formatDuration, orEmpty } from '../../utils/formatters'
import { paths } from '../../utils/routePaths'

function AmountLink({ studentId, value }) {
  return (
    <Link component={RouterLink} to={paths.studentPayments(studentId)} underline="hover">
      {formatCurrency(value)}
    </Link>
  )
}

// Auditing starts in Awaiting (every payment verified and the plan's amount met); audited
// leads can be reviewed.
function AuditCell({ row }) {
  const stage = getLeadStage(row)
  if (stage === LEAD_STAGES.pending) {
    return (
      <Tooltip title={getPendingReason(row)}>
        <span>
          <Button size="small" disabled>
            Audit
          </Button>
        </span>
      </Tooltip>
    )
  }
  const audited = stage === LEAD_STAGES.audited
  return (
    <Button
      component={RouterLink}
      to={paths.leadAudit(row.id)}
      size="small"
      variant={audited ? 'text' : 'contained'}
      disableElevation
    >
      {audited ? 'View' : 'Audit'}
    </Button>
  )
}

// Each row is a lead record plus its derived `flags` (see utils/salesFlags).
const BASE_COLUMNS = [
  { label: 'Audit', render: (row) => <AuditCell row={row} /> },
  {
    label: 'Student Name',
    render: (row) => (
      <Link
        component={RouterLink}
        to={paths.student(row.id)}
        underline="hover"
        sx={{ fontWeight: 600 }}
      >
        {row.studentFullName}
      </Link>
    ),
  },
  { label: 'Student Email', render: (row) => orEmpty(row.email) },
  { label: 'Phone Number', render: (row) => orEmpty(row.primaryPhone) },
  { label: 'Course', render: (row) => orEmpty(row.course) },
  { label: 'Course Fee', render: (row) => formatCurrency(row.courseValue) },
  { label: 'Discount Price', render: (row) => formatCurrency(row.discountGiven) },
  { label: 'Discount', render: (row) => <DiscountStatusCell discount={row.discount} /> },
  { label: 'Payment Type', render: (row) => orEmpty(row.paymentType) },
  {
    label: 'Down Payment',
    render: (row) => (
      <CreditStatusCell
        credit={row.credits?.bookingAmount}
        to={paths.studentPayments(row.id, 'downPayment')}
      />
    ),
  },
  {
    label: 'Initial Payment',
    render: (row) => (
      <CreditStatusCell credit={row.credits?.part1} to={paths.studentPayments(row.id, 'partial')} />
    ),
  },
  {
    label: 'Remaining Balance',
    render: (row) => (
      <CreditStatusCell
        credit={row.credits?.remainingBalance}
        to={paths.studentPayments(row.id, 'remainingBalance')}
      />
    ),
  },
  { label: 'Partial Split-Up Category', render: (row) => orEmpty(row.partialSplitUpCategory) },
  { label: 'Total Paid', render: (row) => <AmountLink studentId={row.id} value={row.totalPaid} /> },
  {
    label: 'Balance Amount',
    render: (row) => <AmountLink studentId={row.id} value={row.balanceAmount} />,
  },
  { label: 'Sale Owner', render: (row) => orEmpty(row.saleOwner?.trim()) },
  { label: 'Sale Owner Manager', render: (row) => orEmpty(row.saleOwnerManager) },
  { label: 'Audit Coordinator', render: (row) => orEmpty(row.auditCoordinator) },
  {
    label: 'EMI Details',
    render: (row) => (
      <YesNoCell value={row.flags.emiDetails} to={paths.studentPayments(row.id, 'emi')} />
    ),
  },
  {
    label: 'Partial Reminders',
    render: (row) => (
      <YesNoCell value={row.flags.partialReminders} to={paths.studentPayments(row.id, 'partial')} />
    ),
  },
  {
    label: 'Subscription Reminders',
    render: (row) => (
      <YesNoCell
        value={row.flags.subscriptionReminders}
        to={paths.studentPayments(row.id, 'subscription')}
      />
    ),
  },
  {
    label: 'CC Link',
    render: (row) =>
      row.confirmationCallLink ? (
        <Button
          component={RouterLink}
          to={paths.ccVerification(row.id)}
          size="small"
          startIcon={<FactCheckOutlinedIcon fontSize="small" />}
        >
          Verify
        </Button>
      ) : (
        EMPTY_VALUE
      ),
  },
]

// Shown on the Sales Action Pending tab only.
function getEscalationColumns({ now, canSend, sendingId, onSend }) {
  return [
    {
      label: 'Time in SAP',
      render: (row) => (
        <Typography
          variant="body2"
          sx={{
            fontSize: 13,
            fontWeight: isSapOverdue(row, now) ? 600 : 400,
            color: isSapOverdue(row, now) ? 'error.main' : 'text.primary',
          }}
        >
          {row.sapEnteredAt ? formatDuration(getSapAgeMs(row, now)) : EMPTY_VALUE}
        </Typography>
      ),
    },
    {
      label: 'Escalation',
      render: (row) => (
        <EscalationCell
          lead={row}
          now={now}
          canSend={canSend}
          sending={sendingId === row.id}
          onSend={onSend}
        />
      ),
    },
  ]
}

// Needed to act on a row, so they can't be hidden.
const LOCKED_COLUMNS = ['Audit', 'Student Name']

// `actions`: extra toolbar content shown left of the Columns button (e.g. Filters).
function SalesActionTable({ leads, showEscalation, now, canSend, sendingId, onSend, actions }) {
  const rows = useMemo(
    () => leads.map((lead) => ({ ...lead, flags: getSalesFlags(lead) })),
    [leads],
  )
  const { isVisible, toggle, showAll } = useColumnVisibility('salesAudit.leadsTable.hiddenColumns')
  const columns = showEscalation
    ? [...BASE_COLUMNS, ...getEscalationColumns({ now, canSend, sendingId, onSend })]
    : BASE_COLUMNS
  const visibleColumns = columns.filter(
    (column) => LOCKED_COLUMNS.includes(column.label) || isVisible(column.label),
  )
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        {actions}
        <ColumnPicker
          labels={columns.map((column) => column.label)}
          locked={LOCKED_COLUMNS}
          isVisible={isVisible}
          onToggle={toggle}
          onShowAll={showAll}
        />
      </Box>
      <DataTable columns={visibleColumns} rows={rows} />
    </>
  )
}

export default SalesActionTable
