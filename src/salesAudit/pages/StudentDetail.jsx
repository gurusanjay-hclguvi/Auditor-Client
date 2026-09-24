import { useCallback, useState } from 'react'
import { Box, Button, Grid, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import YesNoCell from '../components/common/YesNoCell'
import DiscountStatusCell from '../components/common/DiscountStatusCell'
import PaymentDetails from '../components/payments/PaymentDetails'
import CheckSourceButton from '../components/ccVerification/CheckSourceButton'
import { getStudent, getStudentPayments } from '../apiCalls/salesAuditApi'
import { useApi } from '../utils/useApi'
import { getSalesFlags } from '../utils/salesFlags'
import { orEmpty } from '../utils/formatters'
import { paths } from '../utils/routePaths'
import { ROLES, checkLeadAccess, getHomeLink, useCurrentUser } from '../utils/roles'
import { overlineSx } from '../styles/tableSx'

function getProfileItems(student) {
  const flags = getSalesFlags(student)
  const paymentsLink = (category) => paths.studentPayments(student.id, category)
  return [
    { label: 'Email', value: orEmpty(student.email) },
    { label: 'Phone Number', value: orEmpty(student.primaryPhone) },
    { label: 'Course', value: orEmpty(student.course) },
    { label: 'Enrolled On', value: orEmpty(student.enrolledOn) },
    { label: 'Mode of Study', value: orEmpty(student.modeOfStudy) },
    { label: 'Preferred Language', value: orEmpty(student.preferredLanguage) },
    { label: 'Sales Team', value: orEmpty(student.salesTeam) },
    { label: 'Lead Source', value: orEmpty(student.leadSource) },
    { label: 'Sale Owner', value: orEmpty(student.saleOwner?.trim()) },
    { label: 'Sale Owner Manager', value: orEmpty(student.saleOwnerManager) },
    { label: 'Zen ID', value: orEmpty(student.zenId) },
    { label: 'Audit Coordinator', value: orEmpty(student.auditCoordinator) },
    { label: 'Onboard Coordinator', value: orEmpty(student.onboardCoordinator) },
    { label: 'Pays in Same Month', value: orEmpty(student.paysInSameMonth) },
    { label: 'Discount', value: <DiscountStatusCell discount={student.discount} /> },
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
  const user = useCurrentUser()
  const homeLink = getHomeLink(user.role)
  const fetchStudentWithPayments = useCallback(
    (token) =>
      Promise.all([getStudent(token, studentId), getStudentPayments(token, studentId)]).then(
        ([student, payments]) => [checkLeadAccess(user, student), payments],
      ),
    [studentId, user],
  )
  const { data, loading, error, reload } = useApi(fetchStudentWithPayments)
  const [student, payments] = data ?? []
  const [nowMs] = useState(() => Date.now())

  return (
    <Box>
      <PageHeader
        title={student?.studentFullName ?? 'Student'}
        subtitle={student?.course}
        backTo={homeLink.to}
        backLabel={homeLink.label}
        action={
          student && (
            <Stack direction="row" spacing={1}>
              <CheckSourceButton leadId={student.id} link={student.confirmationCallLink} />
              {user.role === ROLES.auditor && (
                <Button component={RouterLink} to={paths.leadAudit(student.id)} variant="contained">
                  Open audit
                </Button>
              )}
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

            <PaymentDetails student={student} payments={payments} nowMs={nowMs} />
          </Stack>
        )}
      </PageState>
    </Box>
  )
}

export default StudentDetail
