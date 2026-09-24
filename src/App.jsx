import { Suspense } from 'react'
import { AppBar, Box, Button, CircularProgress, Container, Toolbar, Typography } from '@mui/material'
import { useSelector } from 'react-redux'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import salesAuditRoutes from './salesAudit/routes'
import salesAuditNavItems from './salesAudit/navItems'

// Dev shell standing in for the Zen portal: permission-gated nav and routes for the feature.
function canAccess(permissions, permission) {
  const [key, action] = permission.split('.')
  return Boolean(permissions[key]?.[action === 'edit' ? 'write' : 'read'])
}

function App() {
  const permissions = useSelector((state) => state.reducers.commonData.permission)
  const routes = salesAuditRoutes.filter((route) => canAccess(permissions, route.permission))
  const navItems = salesAuditNavItems.filter((item) => permissions[item.key]?.read)

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
                  <Navigate to={routes[0].path} replace />
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
