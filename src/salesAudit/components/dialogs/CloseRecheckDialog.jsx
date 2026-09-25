import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { closeRecheck } from '../../apiCalls/salesAuditApi'
import { ReasonList } from '../rechecks/RecheckReasons'
import { useAction } from '../../utils/useAction'

// Closes a recheck ticket (BDA, BDM or auditor). Who closed it is recorded, and the lead's
// auditor is told it can be audited again.
function CloseRecheckDialog({ recheck, onClose, onClosed }) {
  const [note, setNote] = useState('')
  const { run, busy, error, clearError } = useAction(closeRecheck)

  function close() {
    setNote('')
    clearError()
    onClose()
  }

  async function submit() {
    const closed = await run(recheck.id, note)
    if (closed) {
      close()
      onClosed(closed)
    }
  }

  return (
    <Dialog open={Boolean(recheck)} onClose={close} fullWidth maxWidth="sm">
      {recheck && (
        <>
          <DialogTitle>
            Close {recheck.recheckNo} · {recheck.leadName}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ReasonList recheck={recheck} color="text.secondary" />
            <TextField
              label="What was fixed"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              multiline
              minRows={3}
              required
              autoFocus
            />
            {error && <Alert severity="error">{error}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={close}>Cancel</Button>
            <Button variant="contained" onClick={submit} disabled={busy || !note.trim()}>
              Close ticket
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

export default CloseRecheckDialog
