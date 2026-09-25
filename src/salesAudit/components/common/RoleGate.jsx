import { Alert, Button } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import PageState from './PageState'
import { useApi } from '../../utils/useApi'
import { CurrentUserContext, ROLE_LABELS, getRoleHome, loadCurrentUser } from '../../utils/roles'

// Wraps every Sales Audit page: loads who is signed in (GET /me) and only renders the page for
// the roles it is meant for. Zen's shell gates by permission; roles are the feature's own, so
// they are checked here (and again by the backend).
function RoleGate({ roles, children }) {
  const { data: user, loading, error, reload } = useApi(loadCurrentUser)

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      {user &&
        (roles && !roles.includes(user.role) ? (
          <Alert
            severity="info"
            action={
              <Button
                component={RouterLink}
                to={getRoleHome(user.role)}
                color="inherit"
                size="small"
              >
                Go to my page
              </Button>
            }
          >
            This page isn&apos;t available for your role ({ROLE_LABELS[user.role] ?? user.role}).
          </Alert>
        ) : (
          <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>
        ))}
    </PageState>
  )
}

export default RoleGate
