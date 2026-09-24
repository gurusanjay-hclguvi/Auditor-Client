import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material'
import { CC_RESPONSES } from '../../utils/recheckStatus'
import { MUTED_TEXT } from '../../styles/tableSx'

// BDA reports why a lead's CC is still pending. Mount with a fresh `key` per lead.
function CcPendingDialog({ lead, onClose, onSubmit }) {
  const [response, setResponse] = useState(lead?.ccResponse?.response ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(lead.id, response)
    } catch (submitError) {
      setError(submitError.message)
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={Boolean(lead)} onClose={submitting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>CC pending · {lead?.studentFullName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: MUTED_TEXT, mb: 1.5 }}>
          No confirmation call has been uploaded for this lead yet. What is its status?
        </Typography>
        <RadioGroup value={response} onChange={(event) => setResponse(event.target.value)}>
          {Object.entries(CC_RESPONSES).map(([key, { label }]) => (
            <FormControlLabel key={key} value={key} control={<Radio />} label={label} />
          ))}
        </RadioGroup>
        {response === 'mailNotSent' && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            The BDA will be alerted automatically to send the CC mail.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!response || submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CcPendingDialog
