import { useState } from 'react'
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { RECHECK_CATEGORIES } from '../../utils/recheckStatus'
import { contactName } from '../../utils/formatters'
import { MUTED_TEXT } from '../../styles/tableSx'

// Mount with a fresh `key` per open so the form starts from `initialValues` each time.
// initialValues: optional { leadId, category, notes }, e.g. pre-filled from a detected mismatch.
function RaiseRecheckDialog({ open, leads, initialValues, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    lead: leads.find((lead) => lead.id === initialValues?.leadId) ?? null,
    category: initialValues?.category ?? '',
    notes: initialValues?.notes ?? '',
  }))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit = form.lead && form.category && form.notes.trim() && !submitting
  const update = (field) => (value) => setForm((current) => ({ ...current, [field]: value }))

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ leadId: form.lead.id, category: form.category, notes: form.notes.trim() })
    } catch (submitError) {
      setError(submitError.message)
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Raise a recheck</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Autocomplete
            options={leads}
            value={form.lead}
            onChange={(_, lead) => update('lead')(lead)}
            getOptionLabel={(lead) => lead.studentFullName}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label="Lead" required />}
          />
          {form.lead && (
            <Typography variant="caption" sx={{ color: MUTED_TEXT, mt: -1.5 }}>
              Alerts BDA {contactName(form.lead.saleOwner)} and BDM{' '}
              {contactName(form.lead.saleOwnerManager)}
            </Typography>
          )}
          <TextField
            select
            label="Category"
            required
            value={form.category}
            onChange={(event) => update('category')(event.target.value)}
          >
            {Object.entries(RECHECK_CATEGORIES).map(([key, { label }]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="What needs to be rechecked?"
            required
            multiline
            minRows={3}
            value={form.notes}
            onChange={(event) => update('notes')(event.target.value)}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Raising…' : 'Raise & alert BDA/BDM'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RaiseRecheckDialog
