import { Paper, Typography } from '@mui/material'
import { MUTED_TEXT, overlineSx } from '../../styles/tableSx'

// One figure on a dashboard. `onClick` makes it a shortcut to the matching list.
function StatTile({ label, value, hint, color = 'text.primary', onClick }) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2,
        flex: '1 1 160px',
        minWidth: 160,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { borderColor: 'primary.main' } : undefined,
      }}
    >
      <Typography sx={overlineSx}>{label}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, color, mt: 0.5 }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
          {hint}
        </Typography>
      )}
    </Paper>
  )
}

export default StatTile
