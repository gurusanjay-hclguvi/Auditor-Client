import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material'
import { raiseRecheck } from '../../apiCalls/salesAuditApi'
import { RECHECK_CATEGORIES } from '../../utils/labels'
import { useAction } from '../../utils/useAction'

// Raises a recheck on a lead: the BDA and BDM get an alert and a mail with the recheck ID.
function RaiseRecheckDialog({ open, lead, onClose, onRaised }) {
  const [category, setCategory] = useState('')
  const [comments, setComments] = useState('')
  const { run, busy, error, clearError } = useAction(raiseRecheck)

  function close() {
    setCategory('')
    setComments('')
    clearError()
    onClose()
  }

  async function submit() {
    const recheck = await run({ leadId: lead.id, category, comments })
    if (recheck) {
      close()
      onRaised(recheck)
    }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Raise a recheck · {lead.personal.name}</DialogTitle>
      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}
      >
        <TextField
          select
          label="Issue category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          required
        >
          {Object.entries(RECHECK_CATEGORIES).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Comments for the BDA"
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          multiline
          minRows={3}
          required
          helperText="Say exactly what is wrong and what needs fixing."
        />
        <Alert severity="info">
          The BDA ({lead.bdaEmail || 'not set'}) and BDM ({lead.bdmEmail || 'not set'}) get a
          dashboard alert and a mail with the recheck ID.
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button
          variant="contained"
          color="warning"
          onClick={submit}
          disabled={busy || !category || !comments.trim()}
        >
          Raise recheck
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RaiseRecheckDialog
