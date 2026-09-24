import { Box, Button, Stack, Typography } from '@mui/material'
import { ArrowBackRounded as ArrowBackRoundedIcon } from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'

function PageHeader({ title, subtitle, backTo, backLabel = 'Back', action }) {
  return (
    <Box sx={{ mb: 3 }}>
      {backTo && (
        <Button
          component={RouterLink}
          to={backTo}
          size="small"
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ mb: 1, ml: -1, color: 'text.secondary' }}
        >
          {backLabel}
        </Button>
      )}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
    </Box>
  )
}

export default PageHeader
