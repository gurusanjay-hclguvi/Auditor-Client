import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { AddRounded as AddIcon, CloseRounded as RemoveIcon } from '@mui/icons-material'
import { raiseRecheck } from '../../apiCalls/salesAuditApi'
import { RECHECK_CATEGORIES } from '../../utils/labels'
import { useAction } from '../../utils/useAction'

const CATEGORY_COUNT = Object.keys(RECHECK_CATEGORIES).length
const emptyReason = () => ({ category: '', comments: '' })

// Raises one recheck on a lead with one or more reasons, each a category and what to fix. The BDA
// and BDM get an alert and a mail with the recheck ID listing every reason.
function RaiseRecheckDialog({ open, lead, onClose, onRaised }) {
  const [reasons, setReasons] = useState([emptyReason()])
  const { run, busy, error, clearError } = useAction(raiseRecheck)
  const complete = reasons.every((reason) => reason.category && reason.comments.trim())

  const setReason = (index, changes) =>
    setReasons(reasons.map((reason, i) => (i === index ? { ...reason, ...changes } : reason)))

  function close() {
    setReasons([emptyReason()])
    clearError()
    onClose()
  }

  async function submit() {
    const recheck = await run({ leadId: lead.id, reasons })
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
        {reasons.map((reason, index) => {
          // A category can be one reason only, so the others' categories are left out.
          const taken = reasons.filter((_, i) => i !== index).map((other) => other.category)
          return (
            <Box key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }}>
                  Reason {index + 1}
                </Typography>
                {reasons.length > 1 && (
                  <IconButton
                    size="small"
                    aria-label={`Remove reason ${index + 1}`}
                    onClick={() => setReasons(reasons.filter((_, i) => i !== index))}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
              <Stack gap={1.5}>
                <TextField
                  select
                  size="small"
                  label="Issue category"
                  value={reason.category}
                  onChange={(event) => setReason(index, { category: event.target.value })}
                  required
                >
                  {Object.entries(RECHECK_CATEGORIES)
                    .filter(([key]) => !taken.includes(key))
                    .map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                </TextField>
                <TextField
                  size="small"
                  label="Comments for the BDA"
                  value={reason.comments}
                  onChange={(event) => setReason(index, { comments: event.target.value })}
                  multiline
                  minRows={2}
                  required
                  placeholder="Say exactly what is wrong and what needs fixing."
                />
              </Stack>
            </Box>
          )
        })}
        {reasons.length < CATEGORY_COUNT && (
          <Button
            startIcon={<AddIcon />}
            onClick={() => setReasons([...reasons, emptyReason()])}
            sx={{ alignSelf: 'flex-start' }}
          >
            Add reason
          </Button>
        )}
        <Alert severity="info">
          {`One recheck is raised with every reason. The BDA (${lead.bdaEmail || 'not set'}) and BDM (${lead.bdmEmail || 'not set'}) get a dashboard alert and a mail with the recheck ID.`}
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button variant="contained" color="warning" onClick={submit} disabled={busy || !complete}>
          Raise recheck{reasons.length > 1 ? ` (${reasons.length} reasons)` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RaiseRecheckDialog
