import { Box, Typography } from '@mui/material'
import {
  CheckCircleRounded as CheckCircleRoundedIcon,
  WarningAmberRounded as WarningAmberRoundedIcon,
} from '@mui/icons-material'
import { EMPTY_VALUE } from '../../utils/formatters'
import { overlineSx } from '../../styles/tableSx'

const TONES = {
  match: { bgcolor: '#ECFDF3', borderColor: '#ABEFC6', iconColor: '#12B76A' },
  mismatch: { bgcolor: '#FFFAEB', borderColor: '#FEC84B', iconColor: '#DC6803' },
}

function FieldRow({ label, value, matches }) {
  const tone = matches ? TONES.match : TONES.mismatch
  const Icon = matches ? CheckCircleRoundedIcon : WarningAmberRoundedIcon

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        border: '1px solid',
        borderColor: tone.borderColor,
        borderRadius: 1.5,
        bgcolor: tone.bgcolor,
      }}
    >
      <Icon sx={{ fontSize: 18, mt: 0.25, color: tone.iconColor }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={overlineSx}>{label}</Typography>
        <Typography variant="body2" sx={{ mt: 0.25, wordBreak: 'break-word' }}>
          {value || EMPTY_VALUE}
        </Typography>
      </Box>
    </Box>
  )
}

export default FieldRow
