import { Chip, Tooltip } from '@mui/material'
import { CC_STATUS, auditStatusOf, categoryLabel } from '../../utils/labels'

// Small status chips used across the tables.

export function AuditStatusChip({ status }) {
  const { label, color } = auditStatusOf(status)
  return <Chip size="small" label={label} color={color} variant="outlined" />
}

export function CcStatusChip({ status }) {
  const { label, color } = CC_STATUS[status] ?? CC_STATUS.pending
  return <Chip size="small" label={label} color={color} variant="outlined" />
}

export function CategoryChip({ category }) {
  return <Chip size="small" label={categoryLabel(category)} />
}

export function RecheckStatusChip({ recheck }) {
  if (recheck.status === 'open') return <Chip size="small" label="Open" color="warning" />
  if (!recheck.reauditedAt)
    return <Chip size="small" label="Closed · audit pending" color="secondary" />
  return <Chip size="small" label="Closed" color="success" variant="outlined" />
}

// Whether the lead's payments allow auditing (every payment verified, plan minimum met).
export function PaymentReadyChip({ payment }) {
  if (payment?.ready)
    return <Chip size="small" label="Payments verified" color="success" variant="outlined" />
  return (
    <Tooltip title={payment?.shortfall || 'Payments not verified yet'}>
      <Chip size="small" label="Sales action pending" color="warning" variant="outlined" />
    </Tooltip>
  )
}

export function MatchChip({ match }) {
  return match ? (
    <Chip size="small" label="Match" color="success" />
  ) : (
    <Chip size="small" label="Mismatch" color="error" />
  )
}
