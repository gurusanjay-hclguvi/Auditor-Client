import { Box, Stack, Typography } from '@mui/material'
import { CategoryChip } from '../common/Chips'
import { reasonsOf } from '../../utils/labels'

// A chip per reason category, for tables and headers.
export function ReasonChips({ recheck }) {
  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap">
      {reasonsOf(recheck).map((reason) => (
        <CategoryChip key={reason.category} category={reason.category} />
      ))}
    </Stack>
  )
}

// Every reason with its comments: what the BDA has to fix.
export function ReasonList({ recheck, color }) {
  return (
    <Stack component="ol" gap={0.75} sx={{ m: 0, pl: 0, listStyle: 'none' }}>
      {reasonsOf(recheck).map((reason) => (
        <Box component="li" key={reason.category} sx={{ display: 'flex', gap: 1 }}>
          <CategoryChip category={reason.category} />
          <Typography variant="body2" sx={{ color, whiteSpace: 'normal', pt: 0.25 }}>
            {reason.comments}
          </Typography>
        </Box>
      ))}
    </Stack>
  )
}
