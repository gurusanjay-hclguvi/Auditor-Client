import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { OpenInNewRounded as OpenInNewRoundedIcon } from '@mui/icons-material'
import { getPdfSource } from '../../utils/pdfSource'
import { MUTED_TEXT } from '../../styles/tableSx'

const SOURCES = {
  audio: {
    title: 'Source recording',
    chip: 'Call recording',
    caption: 'Listen to the confirmation call while you check the record',
  },
  drive: {
    title: 'Source PDF',
    chip: 'Google Drive',
    caption: 'Shown through Google Drive; you need access to the file',
  },
  direct: { title: 'Source PDF', chip: 'Stored file', caption: 'Confirmation-call document' },
}

function SourceFrame({ source }) {
  if (source.kind === 'audio') {
    return (
      <Box sx={{ py: 3 }}>
        <Box component="audio" controls preload="metadata" src={source.frameUrl} sx={{ width: '100%' }}>
          Your browser can&apos;t play this recording; use Open in new tab.
        </Box>
      </Box>
    )
  }
  return (
    <Box
      component="iframe"
      key={source.frameUrl}
      src={source.frameUrl}
      title="CC source document"
      allow="fullscreen"
      sx={{ flex: 1, width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
    />
  )
}

// The CC source next to the database record: a call recording in an audio player, a Drive file
// through Drive's preview, an S3 / direct PDF as it is (see utils/pdfSource.js).
function SourcePdfPanel({ url }) {
  const source = getPdfSource(url)
  const info = source ? SOURCES[source.kind] : SOURCES.direct
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        height: source?.kind === 'audio' ? 'auto' : '100%',
        minHeight: source?.kind === 'audio' ? 0 : 600,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {info.title}
            </Typography>
            {source && <Chip size="small" variant="outlined" label={info.chip} />}
          </Stack>
          <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
            {info.caption}
          </Typography>
        </Box>
        {source && (
          <Button
            size="small"
            href={source.openUrl}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewRoundedIcon />}
          >
            Open in new tab
          </Button>
        )}
      </Stack>
      {source ? (
        <SourceFrame source={source} />
      ) : (
        <Alert severity="warning">
          The stored source link is not a web address, so it can&apos;t be opened here.
        </Alert>
      )}
    </Paper>
  )
}

export default SourcePdfPanel
