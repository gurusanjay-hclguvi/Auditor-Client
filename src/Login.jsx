import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Divider,
  ListSubheader,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useDispatch } from 'react-redux'
import MOCK_USERS, { findMockUser } from './mockUsers'
import { logIn } from './store/commonDataSlice'
import { ROLES, ROLE_LABELS } from './salesAudit/utils/roles'

// Dev-shell login for the auditor, BDMs and BDAs (demo accounts). Zen's own login replaces it.
function Login() {
  const dispatch = useDispatch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    const user = findMockUser(email)
    if (!user || !password) {
      setError('Unknown email or empty password. Use one of the demo accounts below.')
      return
    }
    dispatch(logIn(user))
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Zen · Sales Audit
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Sign in as the auditor, a BDM or a BDA
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoFocus
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
            />
            <Button type="submit" variant="contained" size="large">
              Sign in
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }}>Demo accounts</Divider>
        <TextField
          select
          fullWidth
          size="small"
          label="Pick an account to fill the email (any password works)"
          value={MOCK_USERS.some((user) => user.email === email) ? email : ''}
          onChange={(event) => {
            setEmail(event.target.value)
            setError(null)
          }}
        >
          {Object.values(ROLES).flatMap((role) => [
            <ListSubheader key={`header-${role}`}>{ROLE_LABELS[role]}</ListSubheader>,
            ...MOCK_USERS.filter((user) => user.role === role).map((user) => (
              <MenuItem key={user.email} value={user.email}>
                {user.name} · {user.email}
              </MenuItem>
            )),
          ])}
        </TextField>
      </Paper>
    </Box>
  )
}

export default Login
