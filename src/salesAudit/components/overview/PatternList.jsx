import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { LightbulbOutlined as LightbulbOutlinedIcon } from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import { RECHECK_CATEGORIES } from '../../utils/recheckStatus'
import { paths } from '../../utils/routePaths'
import { MUTED_TEXT } from '../../styles/tableSx'

const KIND_LABELS = {
  category: 'Repeat issue',
  lead: 'Repeat lead',
  mismatch: 'Mismatches',
  slowResolution: 'Slow turnaround',
}

// The Rechecks page is the auditor's, so the BDA View hides that link.
function patternLinks(pattern, showRechecksLink) {
  const links = []
  if (pattern.leadId) links.push({ label: 'View lead', to: paths.student(pattern.leadId) })
  if (showRechecksLink && pattern.category) {
    links.push({
      label: `View ${RECHECK_CATEGORIES[pattern.category].label} rechecks`,
      to: `${paths.rechecks()}?status=all&category=${pattern.category}`,
    })
  }
  return links
}

// Findings from findRepeatPatterns, each with its evidence and a suggested follow-up.
function PatternList({ patterns, showRechecksLink = true, emptyMessage }) {
  if (patterns.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
        {emptyMessage}
      </Typography>
    )
  }

  return (
    <Stack spacing={1.5}>
      {patterns.map((pattern) => (
        <Paper key={pattern.id} variant="outlined" sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Chip
                  label={KIND_LABELS[pattern.kind]}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {pattern.title}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {pattern.evidence}
                {pattern.bdmName ? ` · BDM ${pattern.bdmName}` : ''}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mt: 1 }}>
                <LightbulbOutlinedIcon sx={{ fontSize: 18, color: 'primary.main', mt: 0.1 }} />
                <Typography variant="body2">{pattern.suggestion}</Typography>
              </Stack>
            </Box>
            <Stack direction={{ xs: 'row', md: 'column' }} spacing={0.5} alignItems="flex-start">
              {patternLinks(pattern, showRechecksLink).map((link) => (
                <Button
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  size="small"
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {link.label}
                </Button>
              ))}
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}

export default PatternList
