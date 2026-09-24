import { Box, Chip, Grid, Link, Paper, Stack, Typography } from '@mui/material'
import { OpenInNewRounded as OpenInNewRoundedIcon } from '@mui/icons-material'
import DataTable from '../common/DataTable'
import PageState from '../common/PageState'
import PaymentsTable from './PaymentsTable'
import EmiDetails from './EmiDetails'
import DiscountStatusCell from '../common/DiscountStatusCell'
import { EMPTY_VALUE, formatCurrency, orEmpty } from '../../utils/formatters'
import { displayZohoDate } from '../../utils/zohoLead'
import { INSTALLMENT_STATUS, getInstallmentStatus, getNextPayment } from '../../utils/paymentSchedule'
import { overlineSx } from '../../styles/tableSx'

const SCHEDULE_TITLES = { partial: 'Partial payment schedule', subscription: 'Subscription schedule' }

function StatusChip({ status }) {
  const { label, color } = INSTALLMENT_STATUS[status]
  return (
    <Chip label={label} size="small" color={color} variant={status === 'closed' ? 'outlined' : 'filled'} />
  )
}

// EMI plans have no reminders: the balance is the loan, repaid to the vendor.
function EmiPlan({ emi }) {
  const terms = [
    emi.monthlyEmi && `${emi.monthlyEmi}/month`,
    emi.tenure,
    emi.vendor,
    emi.status,
  ].filter(Boolean)
  return (
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      Covered by EMI{terms.length ? ` · ${terms.join(' · ')}` : ''}
    </Typography>
  )
}

function NextPayment({ next, emi }) {
  if (next.state === 'unknown') {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        No payment plan recorded yet
      </Typography>
    )
  }
  if (next.state === 'paid') return <Chip label="Fully paid" size="small" color="success" />
  if (next.state === 'none' && emi) return <EmiPlan emi={emi} />
  if (next.state === 'none') {
    return (
      <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>
        Balance due, no installment scheduled
      </Typography>
    )
  }
  const { item, status } = next
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {displayZohoDate(item.dueDate)} · {formatCurrency(item.amount)}
      </Typography>
      <StatusChip status={status} />
    </Stack>
  )
}

function getScheduleColumns(nowMs) {
  return [
    { label: '#', render: (item) => orEmpty(item.number) },
    { label: 'Due Date', render: (item) => orEmpty(displayZohoDate(item.dueDate)) },
    { label: 'Amount', render: (item) => formatCurrency(item.amount) },
    { label: 'Status', render: (item) => <StatusChip status={getInstallmentStatus(item, nowMs)} /> },
    { label: 'Paid On', render: (item) => orEmpty(item.paidOn) },
    {
      label: 'Payment Link',
      render: (item) =>
        item.paymentUrl ? (
          <Link
            href={item.paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
          >
            Open <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
          </Link>
        ) : (
          EMPTY_VALUE
        ),
    },
  ]
}

// The student's payment picture: the plan and totals, the EMI loan for EMI plans, what has been
// paid (financialDetails), and the partial / subscription schedule with the next payment date.
function PaymentDetails({ student, payments, nowMs }) {
  const { schedule } = student
  const isEmiPlan = /EMI/.test(student.paymentType)
  const next = getNextPayment(schedule, student.balanceAmount, nowMs)
  const summary = [
    { label: 'Payment Type', value: orEmpty(student.paymentType) },
    { label: 'Split Category', value: orEmpty(student.partialSplitUpCategory) },
    { label: 'Course Fee', value: formatCurrency(student.courseValue) },
    {
      label: 'Discount',
      value: student.discount ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <span>{formatCurrency(student.discount.amount)}</span>
          <DiscountStatusCell discount={student.discount} />
        </Stack>
      ) : (
        EMPTY_VALUE
      ),
    },
    { label: 'Total Paid', value: formatCurrency(student.totalPaid) },
    { label: 'Balance', value: formatCurrency(student.balanceAmount) },
    {
      label: 'Next Payment',
      value: <NextPayment next={next} emi={isEmiPlan ? student.emiDetails : null} />,
      wide: true,
    },
  ]

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
        Payment details
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {summary.map((item) => (
          <Grid item xs={12} sm={item.wide ? 12 : 6} md={item.wide ? 6 : 3} key={item.label}>
            <Typography sx={overlineSx}>{item.label}</Typography>
            <Box sx={{ mt: 0.5, fontSize: 14 }}>{item.value}</Box>
          </Grid>
        ))}
      </Grid>

      <Stack spacing={3}>
        {isEmiPlan && student.emiDetails && <EmiDetails emi={student.emiDetails} />}

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            What has been paid
          </Typography>
          <PageState empty={payments.length === 0} emptyMessage="Nothing has been paid yet.">
            <PaymentsTable payments={payments} />
          </PageState>
        </Box>

        {schedule.items.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              {SCHEDULE_TITLES[schedule.kind]}
            </Typography>
            <DataTable
              columns={getScheduleColumns(nowMs)}
              rows={schedule.items.map((item, index) => ({ ...item, id: item.id || String(index) }))}
            />
          </Box>
        )}
      </Stack>
    </Paper>
  )
}

export default PaymentDetails
