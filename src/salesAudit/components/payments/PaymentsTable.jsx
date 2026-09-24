import { Typography } from '@mui/material'
import DataTable from '../common/DataTable'
import VerificationChip from '../leads/VerificationChip'
import { getVerificationStatus } from '../../utils/leadStatus'
import { getPaymentTypeLabel } from '../../utils/paymentCategories'
import { formatCurrency, orEmpty } from '../../utils/formatters'

// One row per financialDetails record (see toPayments).
const COLUMNS = [
  {
    label: 'Payment',
    render: (payment) => (
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{getPaymentTypeLabel(payment.type)}</Typography>
    ),
  },
  { label: 'Amount', render: (payment) => formatCurrency(payment.amount) },
  { label: 'Paid On', render: (payment) => orEmpty(payment.paymentDate) },
  { label: 'Mode', render: (payment) => orEmpty(payment.modeOfPayment) },
  { label: 'Payment / UTR ID', render: (payment) => orEmpty(payment.paymentId) },
  {
    label: 'Verified',
    render: (payment) => <VerificationChip status={getVerificationStatus(payment.verified)} />,
  },
  { label: 'Verified On', render: (payment) => orEmpty(payment.verifiedDate) },
]

function PaymentsTable({ payments }) {
  return <DataTable columns={COLUMNS} rows={payments} />
}

export default PaymentsTable
