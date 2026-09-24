// Recheck categories an auditor can raise against a lead; `key` is what the API stores.
export const RECHECK_CATEGORIES = {
  ccPending: { label: 'CC Pending', color: 'warning' },
  payment: { label: 'Payment', color: 'error' },
  emi: { label: 'EMI', color: 'secondary' },
  approval: { label: 'Approval', color: 'info' },
  missedPointsInCc: { label: 'Missed points in CC', color: 'warning' },
  downPayment: { label: 'Down Payment', color: 'error' },
}

export const RECHECK_STATUS = {
  open: { label: 'Open', color: 'warning' },
  resolved: { label: 'Resolved', color: 'success' },
}

// The CC is the lead's Confirmation Call link: present means the BDA has uploaded it.
export function getCcStatus(lead) {
  return lead.confirmationCallLink ? 'completed' : 'pending'
}

// What the BDA reports for a pending CC.
export const CC_RESPONSES = {
  mailSentAwaitingAck: {
    label: 'Mail sent, acknowledgement not received',
    shortLabel: 'Awaiting acknowledgement',
  },
  mailNotSent: {
    label: 'Mail not sent yet',
    shortLabel: 'Mail not sent',
  },
}
