import { Box, Paper, Stack, Typography } from '@mui/material'
import { MUTED_TEXT } from '../../styles/tableSx'
import { EMPTY_VALUE } from '../../utils/formatters'

// A titled card, used for the lead page's sections.
export function SectionCard({ title, action, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Paper>
  )
}

// Label / value pairs in a responsive grid. fields: [[label, value], ...]
export function FieldGrid({ fields }) {
  return (
    <Box
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}
    >
      {fields.map(([label, value]) => (
        <Box key={label}>
          <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
            {value === '' || value == null ? EMPTY_VALUE : value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
