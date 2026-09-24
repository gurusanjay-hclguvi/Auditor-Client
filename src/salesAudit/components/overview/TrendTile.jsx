import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import TrendDelta from '../common/TrendDelta'
import { overlineSx } from '../../styles/tableSx'

// Current count, change vs the previous period, and a link to the records behind it.
function TrendTile({ trend, periodLabel, to, linkLabel }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Stack spacing={0.75} sx={{ height: '100%' }}>
        <Typography sx={overlineSx}>{trend.label}</Typography>
        <Typography sx={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
          {trend.current}
        </Typography>
        <TrendDelta trend={trend} periodLabel={periodLabel} />
        {to && (
          <Button
            component={RouterLink}
            to={to}
            size="small"
            sx={{ alignSelf: 'flex-start', ml: -1, mt: 'auto' }}
          >
            {linkLabel}
          </Button>
        )}
      </Stack>
    </Paper>
  )
}

export default TrendTile
