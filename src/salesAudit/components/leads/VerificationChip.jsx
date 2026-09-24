import { Chip } from '@mui/material'
import { VERIFICATION_CHIP } from '../../utils/leadStatus'
import { MUTED_TEXT } from '../../styles/tableSx'

// status: a key of VERIFICATION_CHIP (verified | unverified | mismatch | refund | notPaid).
function VerificationChip({ status }) {
  const { label, color } = VERIFICATION_CHIP[status]
  return (
    <Chip
      label={label}
      size="small"
      color={color}
      variant="outlined"
      sx={status === 'notPaid' ? { color: MUTED_TEXT } : undefined}
    />
  )
}

export default VerificationChip
