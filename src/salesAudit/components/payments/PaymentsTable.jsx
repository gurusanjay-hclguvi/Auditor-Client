import DataTable from '../common/DataTable'
import VerificationChip from '../leads/VerificationChip'
import { getVerificationStatus } from '../../utils/leadStatus'
import { formatCurrency, orEmpty } from '../../utils/formatters'

const COLUMNS = [
  { label: 'Type', render: (payment) => orEmpty(payment.type) },
  { label: 'Payment Type', render: (payment) => orEmpty(payment.paymentType) },
  { label: 'Mode of Payment', render: (payment) => orEmpty(payment.modeOfPayment) },
  { label: 'Amount', render: (payment) => formatCurrency(payment.amount) },
  { label: 'Payment Date', render: (payment) => orEmpty(payment.paymentDate) },
  {
    label: 'Verified',
    render: (payment) => <VerificationChip status={getVerificationStatus(payment.verified)} />,
  },
  { label: 'Course', render: (payment) => orEmpty(payment.course) },
  { label: 'Course Value', render: (payment) => formatCurrency(payment.courseValue) },
]

function PaymentsTable({ payments }) {
  return <DataTable columns={COLUMNS} rows={payments} />
}

export default PaymentsTable
