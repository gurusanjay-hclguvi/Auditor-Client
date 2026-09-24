import { Box, Paper, Stack, Typography } from '@mui/material'
import { EMPTY_VALUE } from '../../utils/formatters'
import { MUTED_TEXT, overlineSx } from '../../styles/tableSx'

// The lead as recorded in the database, grouped into sections of {key, label, value} rows.
function RecordPanel({ sections }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Database record
      </Typography>
      <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
        What Zoho holds for this lead
      </Typography>

      <Stack spacing={2.5} sx={{ mt: 2 }}>
        {sections.map((section) => (
          <Stack key={section.title} spacing={1}>
            <Typography sx={{ ...overlineSx, fontSize: 12, fontWeight: 700 }}>
              {section.title}
            </Typography>
            {section.rows.map((row) => (
              <Box
                key={row.key}
                sx={{
                  px: 1.5,
                  py: 1.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                }}
              >
                <Typography sx={overlineSx}>{row.label}</Typography>
                <Typography variant="body2" sx={{ mt: 0.25, wordBreak: 'break-word' }}>
                  {row.value || EMPTY_VALUE}
                </Typography>
              </Box>
            ))}
          </Stack>
        ))}
      </Stack>
    </Paper>
  )
}

export default RecordPanel
