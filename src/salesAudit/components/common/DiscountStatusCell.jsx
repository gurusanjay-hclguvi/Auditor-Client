import { Chip, Tooltip } from '@mui/material'
import { DISCOUNT_STATUS } from '../../utils/zohoLead'
import { formatCurrency } from '../../utils/formatters'
import { MUTED_TEXT } from '../../styles/tableSx'

// The lead's discount (see getDiscount): "Approved" or "Requested", or "No" without a discount.
// The tooltip gives the amount and the requested vs actual course fee.
function DiscountStatusCell({ discount }) {
  if (!discount) {
    return <Chip label="No" size="small" variant="outlined" sx={{ color: MUTED_TEXT }} />
  }
  // The backend's lead list only has the amount; the status comes with the lead's audit.
  if (!discount.status) {
    return (
      <Tooltip title={`${formatCurrency(discount.amount)} discount · open the audit for its status`}>
        <Chip label="Yes" size="small" color="primary" variant="outlined" />
      </Tooltip>
    )
  }
  const approved = discount.status === DISCOUNT_STATUS.approved
  const fees =
    discount.actualCourseFee && discount.requestedCourseFee
      ? ` · ${formatCurrency(discount.actualCourseFee)} → ${formatCurrency(discount.requestedCourseFee)}`
      : ''
  const by = discount.requestedBy ? ` · requested by ${discount.requestedBy}` : ''
  return (
    <Tooltip title={`${formatCurrency(discount.amount)} discount${fees}${by}`}>
      <Chip
        label={discount.status}
        size="small"
        color={approved ? 'success' : 'warning'}
        variant={approved ? 'filled' : 'outlined'}
      />
    </Tooltip>
  )
}

export default DiscountStatusCell
