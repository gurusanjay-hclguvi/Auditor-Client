import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'

// Confirms "Mark verified → Awaiting". When checks are failing, a reason is required.
function MarkVerifiedDialog({ leadName, failingItems, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const needsReason = failingItems.length > 0

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
    } catch (confirmError) {
      setError(confirmError.message)
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Mark {leadName} as verified?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          The lead moves from Sales Action Pending to Awaiting.
        </Typography>
        {needsReason && (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {failingItems.length} check{failingItems.length === 1 ? ' is' : 's are'} still
              failing: {failingItems.map((item) => item.label).join(', ')}.
            </Alert>
            <TextField
              label="Reason for verifying anyway"
              required
              fullWidth
              multiline
              minRows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={needsReason ? 'warning' : 'primary'}
          onClick={handleConfirm}
          disabled={submitting || (needsReason && !reason.trim())}
        >
          {submitting ? 'Saving…' : needsReason ? 'Verify anyway' : 'Verify → Awaiting'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MarkVerifiedDialog
