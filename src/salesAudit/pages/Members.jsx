import { useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import DataTable from '../components/common/DataTable'
import { createMember, getMembers, updateMember } from '../apiCalls/salesAuditApi'
import { REGIONS } from '../utils/labels'
import { ROLE_LABELS, useCanWrite } from '../utils/roles'
import { useAction } from '../utils/useAction'
import { useApi } from '../utils/useApi'

const EMPTY = {
  name: '',
  email: '',
  userHash: '',
  role: 'auditor',
  region: 'South',
  managerEmail: '',
}
const loadMembers = (token) => getMembers(token)

// The roster (auditor TL): who is an auditor for which region, who reports to whom, and who is
// available for automatic lead assignment.
function Members() {
  const canWrite = useCanWrite()
  const { data, loading, error, reload } = useApi(loadMembers)
  const [form, setForm] = useState(null)
  const create = useAction(createMember)
  const update = useAction(updateMember)

  async function toggle(member) {
    if (await update.run(member.id, { available: !member.available })) reload()
  }

  async function save() {
    if (await create.run(form)) {
      setForm(null)
      reload()
    }
  }

  const managers = (role) =>
    (data ?? []).filter((member) => member.role === (role === 'auditor' ? 'auditorTl' : 'bdm'))

  const columns = [
    { label: 'Name', render: (member) => member.name },
    { label: 'Email', render: (member) => member.email },
    {
      label: 'Role',
      render: (member) => <Chip size="small" label={ROLE_LABELS[member.role] ?? member.role} />,
    },
    { label: 'Region', render: (member) => member.region || '—' },
    { label: 'Reports to', render: (member) => member.managerEmail || '—' },
    {
      label: 'Available',
      render: (member) =>
        member.role === 'auditor' ? (
          <Switch
            checked={member.available}
            disabled={!canWrite || update.busy}
            onChange={() => toggle(member)}
          />
        ) : (
          '—'
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Auditors get new leads of their region automatically while they are available."
        action={
          canWrite && (
            <Button variant="contained" onClick={() => setForm(EMPTY)}>
              Add member
            </Button>
          )
        }
      />
      {update.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {update.error}
        </Alert>
      )}
      <PageState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={data?.length === 0}
        emptyMessage="No members yet."
      >
        {data && <DataTable columns={columns} rows={data} storageKey="members" />}
      </PageState>
      <Dialog open={Boolean(form)} onClose={() => setForm(null)} fullWidth maxWidth="xs">
        {form && (
          <>
            <DialogTitle>Add member</DialogTitle>
            <DialogContent>
              <Stack gap={2} sx={{ pt: 1 }}>
                <TextField
                  label="Name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
                <TextField
                  label="Email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
                <TextField
                  label="Zen user hash"
                  value={form.userHash}
                  onChange={(event) => setForm({ ...form, userHash: event.target.value })}
                  helperText="The user's hash in Zen, so their login maps to this member."
                />
                <TextField
                  select
                  label="Role"
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value, managerEmail: '' })
                  }
                >
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <MenuItem key={role} value={role}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
                {form.role === 'auditor' && (
                  <TextField
                    select
                    label="Region"
                    value={form.region}
                    onChange={(event) => setForm({ ...form, region: event.target.value })}
                  >
                    {REGIONS.map((region) => (
                      <MenuItem key={region} value={region}>
                        {region}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                {(form.role === 'auditor' || form.role === 'bda') && (
                  <TextField
                    select
                    label={form.role === 'auditor' ? 'Auditor TL' : 'BDM'}
                    value={form.managerEmail}
                    onChange={(event) => setForm({ ...form, managerEmail: event.target.value })}
                  >
                    {managers(form.role).map((manager) => (
                      <MenuItem key={manager.id} value={manager.email}>
                        {manager.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                {create.error && <Alert severity="error">{create.error}</Alert>}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setForm(null)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={save}
                disabled={create.busy || !form.name || !form.email}
              >
                Add
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  )
}

export default Members
