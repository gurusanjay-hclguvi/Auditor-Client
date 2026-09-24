import { useCallback } from 'react'
import { Box, Button, Grid, Paper, Stack, Typography } from '@mui/material'
import { FactCheckOutlined as FactCheckOutlinedIcon } from '@mui/icons-material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import YesNoCell from '../components/common/YesNoCell'
import PaymentsTable from '../components/payments/PaymentsTable'
import { getStudent, getStudentPayments } from '../apiCalls/salesAuditApi'
import { useApi } from '../utils/useApi'
import { getSalesFlags } from '../utils/salesFlags'
import { formatCurrency, orEmpty } from '../utils/formatters'
import { paths } from '../utils/routePaths'
import { overlineSx } from '../styles/tableSx'

function getProfileItems(student) {
  const flags = getSalesFlags(student)
  const paymentsLink = (category) => paths.studentPayments(student.id, category)
  return [
    { label: 'Email', value: orEmpty(student.email) },
    { label: 'Phone Number', value: orEmpty(student.primaryPhone) },
    { label: 'Course', value: orEmpty(student.course) },
    { label: 'Course Fee', value: formatCurrency(student.courseValue) },
    { label: 'Discount Price', value: formatCurrency(student.discountGiven) },
    { label: 'Payment Type', value: orEmpty(student.paymentType) },
    { label: 'Partial Split-Up Category', value: orEmpty(student.partialSplitUpCategory) },
    { label: 'Total Paid', value: formatCurrency(student.totalPaid) },
    { label: 'Balance Amount', value: formatCurrency(student.balanceAmount) },
    { label: 'Sale Owner', value: orEmpty(student.saleOwner?.trim()) },
    { label: 'Sale Owner Manager', value: orEmpty(student.saleOwnerManager) },
    { label: 'Discount', value: <YesNoCell value={flags.discount} /> },
    {
      label: 'Down Payment',
      value: <YesNoCell value={flags.downPayment} to={paymentsLink('downPayment')} />,
    },
    { label: 'EMI Details', value: <YesNoCell value={flags.emiDetails} to={paymentsLink('emi')} /> },
    {
      label: 'Partial Reminders',
      value: <YesNoCell value={flags.partialReminders} to={paymentsLink('partial')} />,
    },
    {
      label: 'Subscription Reminders',
      value: <YesNoCell value={flags.subscriptionReminders} to={paymentsLink('subscription')} />,
    },
  ]
}

function StudentDetail() {
  const { studentId } = useParams()
  const fetchStudentWithPayments = useCallback(
    (token) => Promise.all([getStudent(token, studentId), getStudentPayments(token, studentId)]),
    [studentId],
  )
  const { data, loading, error, reload } = useApi(fetchStudentWithPayments)
  const [student, payments] = data ?? []

  return (
    <Box>
      <PageHeader
        title={student?.studentFullName ?? 'Student'}
        subtitle={student?.course}
        backTo={paths.leads()}
        backLabel="Leads"
        action={
          student && (
            <Stack direction="row" spacing={1}>
              {student.confirmationCallLink && (
                <Button
                  component={RouterLink}
                  to={paths.ccVerification(student.id)}
                  startIcon={<FactCheckOutlinedIcon />}
                >
                  Verify CC
                </Button>
              )}
              <Button component={RouterLink} to={paths.leadAudit(student.id)} variant="contained">
                Open audit
              </Button>
            </Stack>
          )
        }
      />

      <PageState loading={loading} error={error} onRetry={reload}>
        {student && (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Grid container spacing={2.5}>
                {getProfileItems(student).map((item) => (
                  <Grid item xs={12} sm={6} md={3} key={item.label}>
                    <Typography sx={overlineSx}>{item.label}</Typography>
                    <Box sx={{ mt: 0.5, fontSize: 14, wordBreak: 'break-word' }}>{item.value}</Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                All Transactions
              </Typography>
              <PageState
                empty={payments.length === 0}
                emptyMessage="No transactions recorded for this student."
              >
                <PaymentsTable payments={payments} />
              </PageState>
            </Box>
          </Stack>
        )}
      </PageState>
    </Box>
  )
}

export default StudentDetail
