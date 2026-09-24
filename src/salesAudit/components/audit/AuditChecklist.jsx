import { Box, Button, Divider, Paper, Stack, Typography } from '@mui/material'
import {
  CheckCircleRounded as CheckCircleRoundedIcon,
  ErrorRounded as ErrorRoundedIcon,
  RemoveCircleOutlineRounded as RemoveCircleOutlineRoundedIcon,
} from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import { MUTED_TEXT } from '../../styles/tableSx'

const STATUS = {
  pass: { Icon: CheckCircleRoundedIcon, color: 'success.main', label: 'Passed' },
  fail: { Icon: ErrorRoundedIcon, color: 'error.main', label: 'Needs attention' },
  na: { Icon: RemoveCircleOutlineRoundedIcon, color: MUTED_TEXT, label: 'Not applicable' },
}

// Auto-ticked audit checklist; failing items offer a pre-filled recheck or a link.
function AuditChecklist({ items, canEdit, onRaise, footer }) {
  const failing = items.filter((item) => item.status === 'fail').length

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Audit checklist
      </Typography>
      <Typography variant="body2" sx={{ color: failing ? 'error.main' : 'success.main', mb: 2 }}>
        {failing ? `${failing} of ${items.length} checks need attention` : 'All checks passed'}
      </Typography>

      <Stack spacing={1.75} divider={<Divider flexItem />}>
        {items.map((item) => {
          const { Icon, color, label } = STATUS[item.status]
          return (
            <Stack key={item.key} direction="row" spacing={1.25} alignItems="flex-start">
              <Icon sx={{ color, fontSize: 20, mt: 0.1 }} titleAccess={label} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.label}
                </Typography>
                <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                  {item.reason}
                </Typography>
                {item.status === 'fail' && canEdit && item.recheck && (
                  <Button
                    size="small"
                    color="error"
                    sx={{ ml: -0.75, mt: 0.25 }}
                    onClick={() => onRaise(item.recheck)}
                  >
                    Raise recheck
                  </Button>
                )}
                {item.status === 'fail' && item.link && (
                  <Button
                    component={RouterLink}
                    to={item.link.to}
                    size="small"
                    sx={{ ml: -0.75, mt: 0.25 }}
                  >
                    {item.link.label}
                  </Button>
                )}
              </Box>
            </Stack>
          )
        })}
      </Stack>

      {footer && <Box sx={{ mt: 2.5 }}>{footer}</Box>}
    </Paper>
  )
}

export default AuditChecklist
