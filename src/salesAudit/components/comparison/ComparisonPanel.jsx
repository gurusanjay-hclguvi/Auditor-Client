import { Paper, Stack, Typography } from '@mui/material'
import FieldRow from './FieldRow'
import { MUTED_TEXT, overlineSx } from '../../styles/tableSx'

// One side of the merge-style comparison; `valueKey` picks systemValue or scrapedValue per row.
function ComparisonPanel({ title, subtitle, sections, valueKey }) {
  return (
    <Paper variant="outlined" sx={{ flex: 1, p: 2, minWidth: 0 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
        {subtitle}
      </Typography>

      <Stack spacing={2.5} sx={{ mt: 2 }}>
        {sections.map((section) => (
          <Stack key={section.title} spacing={1}>
            <Typography sx={{ ...overlineSx, fontSize: 12, fontWeight: 700 }}>
              {section.title}
            </Typography>
            {section.rows.map((row) => (
              <FieldRow key={row.key} label={row.label} value={row[valueKey]} matches={row.matches} />
            ))}
          </Stack>
        ))}
      </Stack>
    </Paper>
  )
}

export default ComparisonPanel
