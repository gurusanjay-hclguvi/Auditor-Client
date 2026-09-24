import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { OpenInNewRounded as OpenInNewRoundedIcon } from '@mui/icons-material'
import { getPdfSource } from '../../utils/pdfSource'
import { MUTED_TEXT } from '../../styles/tableSx'

const SOURCES = {
  drive: {
    chip: 'Google Drive',
    caption: 'Shown through Google Drive; you need access to the file',
  },
  direct: { chip: 'Stored file', caption: 'Confirmation-call document' },
}

function SourceFrame({ source }) {
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

// The CC PDF next to the database record: a Drive file through Drive's preview, an S3 / direct
// link as it is (see utils/pdfSource.js).
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
        height: '100%',
        minHeight: 600,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Source PDF
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
          The stored PDF link is not a web address, so it can&apos;t be opened here.
        </Alert>
      )}
    </Paper>
  )
}

export default SourcePdfPanel
