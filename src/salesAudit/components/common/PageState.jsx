import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import { MUTED_TEXT } from '../../styles/tableSx'

// Renders loading / error / empty states, otherwise its children.
function PageState({ loading, error, empty, emptyMessage, loadingMessage, onRetry, children }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 10 }}>
        <CircularProgress size={32} />
        {loadingMessage && (
          <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
            {loadingMessage}
          </Typography>
        )}
      </Box>
    )
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        {error}
      </Alert>
    )
  }

  if (empty) {
    return (
      <Paper variant="outlined" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
          {emptyMessage}
        </Typography>
      </Paper>
    )
  }

  return children
}

export default PageState
