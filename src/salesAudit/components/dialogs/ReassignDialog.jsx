import { useCallback, useState } from 'react'
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
import { getMembers, reassignLead } from '../../apiCalls/salesAuditApi'
import { useAction } from '../../utils/useAction'
import { useApi } from '../../utils/useApi'

const loadAuditors = (token) => getMembers(token, 'auditor')

// Moves a lead to another auditor (e.g. its auditor is away).
function ReassignDialog({ open, lead, onClose, onReassigned }) {
  const [auditorEmail, setAuditorEmail] = useState('')
  const { data: auditors } = useApi(
    useCallback((token) => (open ? loadAuditors(token) : Promise.resolve([])), [open]),
  )
  const { run, busy, error, clearError } = useAction(reassignLead)
  const current = lead.assignment?.auditorEmail

  function close() {
    setAuditorEmail('')
    clearError()
    onClose()
  }

  async function submit() {
    const updated = await run(lead.id, auditorEmail)
    if (updated) {
      close()
      onReassigned(updated)
    }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>Reassign · {lead.personal.name}</DialogTitle>
      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}
      >
        <TextField
          select
          label="Auditor"
          value={auditorEmail}
          onChange={(event) => setAuditorEmail(event.target.value)}
          helperText={current ? `Now with ${current}` : 'Not assigned yet'}
        >
          {(auditors ?? [])
            .filter((auditor) => auditor.email !== current)
            .map((auditor) => (
              <MenuItem key={auditor.id} value={auditor.email}>
                {auditor.name} · {auditor.region}
                {auditor.available ? '' : ' (away)'}
              </MenuItem>
            ))}
        </TextField>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || !auditorEmail}>
          Reassign
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReassignDialog
