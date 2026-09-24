import { ButtonBase, Paper, Stack, Typography } from '@mui/material'
import { MUTED_TEXT, overlineSx } from '../../styles/tableSx'

// A count of things to do; clicking it filters the action list to that type.
function ActionTile({ label, count, detail, selected, onClick }) {
  const done = count === 0

  return (
    <ButtonBase
      onClick={onClick}
      disabled={done}
      sx={{ display: 'block', width: '100%', height: '100%', borderRadius: 2, textAlign: 'left' }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          height: '100%',
          borderColor: selected ? 'primary.main' : 'divider',
          borderWidth: selected ? 2 : 1,
          bgcolor: selected ? 'rgba(13, 117, 252, 0.04)' : 'background.paper',
        }}
      >
        <Stack spacing={0.5}>
          <Typography sx={overlineSx}>{label}</Typography>
          <Typography
            sx={{
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.2,
              color: done ? MUTED_TEXT : 'text.primary',
            }}
          >
            {count}
          </Typography>
          {done ? (
            <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
              Nothing pending
            </Typography>
          ) : (
            detail
          )}
        </Stack>
      </Paper>
    </ButtonBase>
  )
}

export default ActionTile
