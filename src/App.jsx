import { Suspense } from 'react'
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  ListSubheader,
  MenuItem,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import salesAuditRoutes from './salesAudit/routes'
import salesAuditNavItems from './salesAudit/navItems'
import { setAuthToken } from './store/commonDataSlice'
import { useApi } from './salesAudit/utils/useApi'
import {
  ROLES,
  ROLE_LABELS,
  canUseRoute,
  getRoleHome,
  loadCurrentUser,
} from './salesAudit/utils/roles'
import { mockTokenFor } from './salesAudit/apiCalls/mocks/users'
import { getDevUsers } from './salesAudit/apiCalls/salesAuditApi'

// Dev shell standing in for the Zen portal (starter kit): no login. The token and permissions
// come from the stub store; the feature gates routes by permission and, inside each page, by the
// role of the user GET /me returns. Here the nav also follows that role.
function canAccess(permissions, permission) {
  const [key, action] = permission.split('.')
  return Boolean(permissions[key]?.[action === 'edit' ? 'write' : 'read'])
}

// Dev only: act as any dev user by swapping the token (Zen does this by who logs in). Against the
// backend the list is the BDAs / BDMs on its leads plus a mock auditor.
function MockUserPicker({ user }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { data: users } = useApi(getDevUsers)
  const options = users ?? (user ? [user] : [])
  return (
    <TextField
      select
      size="small"
      label="Mock user (dev)"
      value={user && options.some((option) => option.email === user.email) ? `${user.role}:${user.email}` : ''}
      onChange={(event) => {
        const next = options.find((option) => `${option.role}:${option.email}` === event.target.value)
        dispatch(setAuthToken(mockTokenFor(next)))
        navigate(getRoleHome(next.role))
      }}
      sx={{ minWidth: 280 }}
    >
      {Object.values(ROLES).flatMap((role) => [
        <ListSubheader key={`header-${role}`}>{ROLE_LABELS[role]}</ListSubheader>,
        ...options
          .filter((option) => option.role === role)
          .map((option) => (
            <MenuItem key={`${role}:${option.email}`} value={`${role}:${option.email}`}>
              {option.name === option.email ? option.email : `${option.name} · ${option.email}`}
            </MenuItem>
          )),
      ])}
    </TextField>
  )
}

function App() {
  const permissions = useSelector((state) => state.reducers.commonData.permission)
  const { data: user } = useApi(loadCurrentUser)

  const routes = salesAuditRoutes.filter((route) => canAccess(permissions, route.permission))
  const navItems = salesAuditNavItems.filter(
    (item) => permissions[item.key]?.read && (!user || canUseRoute(user, item.roles)),
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', mr: 2 }}>
            Zen · Sales Audit
          </Typography>
          {navItems.map((item) => (
            <Button
              key={item.route}
              component={NavLink}
              to={item.route}
              startIcon={<Box component="img" src={item.image} alt="" sx={{ width: 18, height: 18 }} />}
              sx={{ color: 'text.secondary', '&.active': { color: 'primary.main' } }}
            >
              {item.label}
            </Button>
          ))}
          <Box sx={{ flex: 1 }} />
          <MockUserPicker user={user} />
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ py: 4 }}>
        <Suspense fallback={<CircularProgress sx={{ display: 'block', mx: 'auto', my: 10 }} />}>
          <Routes>
            {routes.map(({ path, component: Page }) => (
              <Route key={path} path={path} element={<Page />} />
            ))}
            <Route
              path="*"
              element={
                routes.length ? (
                  <Navigate to={user ? getRoleHome(user.role) : routes[0].path} replace />
                ) : (
                  <Typography sx={{ color: 'text.secondary' }}>
                    You don&apos;t have access to this page.
                  </Typography>
                )
              }
            />
          </Routes>
        </Suspense>
      </Container>
    </Box>
  )
}

export default App
