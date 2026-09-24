import { useCallback, useMemo } from 'react'
import { Box, Tab, Tabs } from '@mui/material'
import { useParams, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import PaymentsTable from '../components/payments/PaymentsTable'
import { getStudent, getStudentPayments } from '../apiCalls/salesAuditApi'
import { useApi } from '../utils/useApi'
import {
  PAYMENT_CATEGORIES,
  filterPaymentsByCategory,
  resolveCategory,
} from '../utils/paymentCategories'
import { formatCurrency } from '../utils/formatters'
import { checkLeadAccess, getHomeLink, useCurrentUser } from '../utils/roles'

function StudentPayments() {
  const { studentId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const category = resolveCategory(searchParams.get('category'))

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

  const visiblePayments = useMemo(
    () => filterPaymentsByCategory(payments ?? [], category),
    [payments, category],
  )

  return (
    <Box>
      <PageHeader
        title={student ? `${student.studentFullName} — Payments` : 'Payments'}
        subtitle={
          student &&
          `${student.paymentType} · Paid ${formatCurrency(student.totalPaid)} · Balance ${formatCurrency(student.balanceAmount)}`
        }
        backTo={homeLink.to}
        backLabel={homeLink.label}
      />

      <Tabs
        value={category}
        onChange={(_, next) => setSearchParams({ category: next })}
        variant="scrollable"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {Object.entries(PAYMENT_CATEGORIES).map(([key, { label }]) => (
          <Tab key={key} value={key} label={label} />
        ))}
      </Tabs>

      <PageState
        loading={loading}
        error={error}
        empty={visiblePayments.length === 0}
        emptyMessage={`No ${PAYMENT_CATEGORIES[category].label.toLowerCase()} recorded for this student.`}
        onRetry={reload}
      >
        <PaymentsTable payments={visiblePayments} />
      </PageState>
    </Box>
  )
}

export default StudentPayments
