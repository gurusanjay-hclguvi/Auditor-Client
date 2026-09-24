import { Link, Stack } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import VerificationChip from './VerificationChip'
import { getCreditStatus } from '../../utils/leadStatus'
import { formatCurrency } from '../../utils/formatters'

// Amount paid for one credit (linked to its payments drill-down) plus its verification status.
function CreditStatusCell({ credit, to }) {
  const status = getCreditStatus(credit)

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {credit && (
        <Link component={RouterLink} to={to} underline="hover">
          {formatCurrency(credit.amount)}
        </Link>
      )}
      <VerificationChip status={status} />
    </Stack>
  )
}

export default CreditStatusCell
