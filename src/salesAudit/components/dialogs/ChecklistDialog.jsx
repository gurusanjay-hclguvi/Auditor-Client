import { useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  TextField,
} from '@mui/material'
import { completeAudit } from '../../apiCalls/salesAuditApi'
import { useAction } from '../../utils/useAction'

// The audit checklist: every item ticked and comments added marks the audit completed.
function ChecklistDialog({ open, lead, checklist, mismatchCount, onClose, onCompleted }) {
  const [checked, setChecked] = useState({})
  const [comments, setComments] = useState('')
  const { run, busy, error, clearError } = useAction(completeAudit)
  const allChecked = checklist.every((item) => checked[item.key])

  function close() {
    setChecked({})
    setComments('')
    clearError()
    onClose()
  }

  async function submit() {
    const audit = await run(lead.id, {
      checklist: checklist.map((item) => ({ key: item.key, checked: Boolean(checked[item.key]) })),
      comments,
    })
    if (audit) {
      close()
      onCompleted(audit)
    }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Audit checklist · {lead.personal.name}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {mismatchCount > 0 && (
          <Alert severity="warning">
            {mismatchCount} field{mismatchCount === 1 ? '' : 's'} did not match the CC. Raise a
            recheck instead if any of them is a real issue.
          </Alert>
        )}
        <FormGroup>
          {checklist.map((item) => (
            <FormControlLabel
              key={item.key}
              label={item.label}
              control={
                <Checkbox
                  checked={Boolean(checked[item.key])}
                  onChange={(event) => setChecked({ ...checked, [item.key]: event.target.checked })}
                />
              }
            />
          ))}
        </FormGroup>
        <TextField
          label="Comments"
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          multiline
          minRows={2}
          required
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={submit}
          disabled={busy || !allChecked || !comments.trim()}
        >
          Mark audit completed
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ChecklistDialog
