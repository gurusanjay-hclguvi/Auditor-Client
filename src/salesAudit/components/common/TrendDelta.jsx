import { Stack, Typography } from '@mui/material'
import {
  ArrowDownwardRounded as ArrowDownwardRoundedIcon,
  ArrowUpwardRounded as ArrowUpwardRoundedIcon,
  RemoveRounded as RemoveRoundedIcon,
} from '@mui/icons-material'

const VERDICT_COLOR = { better: 'success.main', worse: 'error.main', same: 'text.secondary' }

// "▲ 2 vs previous 7 days · worse" — direction and verdict are spelled out, not colour-only.
function TrendDelta({ trend, periodLabel }) {
  const Icon =
    trend.delta > 0
      ? ArrowUpwardRoundedIcon
      : trend.delta < 0
        ? ArrowDownwardRoundedIcon
        : RemoveRoundedIcon

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{ color: VERDICT_COLOR[trend.verdict] }}
    >
      <Icon sx={{ fontSize: 14 }} />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {trend.delta === 0
          ? `Same as ${periodLabel}`
          : `${Math.abs(trend.delta)} vs ${periodLabel} · ${trend.verdict}`}
      </Typography>
    </Stack>
  )
}

export default TrendDelta
