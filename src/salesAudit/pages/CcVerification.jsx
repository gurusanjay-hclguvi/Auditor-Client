import { useCallback } from 'react'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { OpenInNewRounded as OpenInNewIcon } from '@mui/icons-material'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import { CourseSection, PaymentSection, PersonalSection } from '../components/leads/LeadSections'
import { getCcVerification } from '../apiCalls/salesAuditApi'
import { MUTED_TEXT } from '../styles/tableSx'
import { CC_TYPE_LABELS } from '../utils/labels'
import { paths } from '../utils/routePaths'
import { useApi } from '../utils/useApi'

// Our record on the left; on the right the CC itself: the confirmation PDF, or the call
// recording's transcript.
function CcVerification() {
  const { leadId } = useParams()
  const { data, loading, error, reload } = useApi(
    useCallback((token) => getCcVerification(token, leadId), [leadId]),
  )

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      {data && (
        <>
          <PageHeader
            title={`CC verify · ${data.lead.personal.name}`}
            subtitle={CC_TYPE_LABELS[data.cc.type] ?? 'CC'}
            backTo={paths.leadAudit(data.lead.id)}
            backLabel="Back to the audit"
            action={
              <Button
                variant="outlined"
                href={data.cc.link}
                target="_blank"
                rel="noreferrer"
                endIcon={<OpenInNewIcon />}
              >
                Open original
              </Button>
            }
          />
          {data.extract.mocked && (
            <Alert severity="info" sx={{ mb: 2 }}>
              The CC reader is not connected yet: the transcript and extracted fields are sample
              data.
            </Alert>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Stack gap={3} sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
              <PersonalSection lead={data.lead} />
              <CourseSection lead={data.lead} />
              <PaymentSection lead={data.lead} />
            </Stack>
            <Paper
              variant="outlined"
              sx={{
                height: 'calc(100vh - 200px)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CcSource data={data} />
            </Paper>
          </Box>
        </>
      )}
    </PageState>
  )
}

function CcSource({ data }) {
  if (data.cc.type === 'pdf' && data.previewUrl) {
    return (
      <Box
        component="iframe"
        title="Confirmation PDF"
        src={data.previewUrl}
        sx={{ border: 0, width: '100%', flex: 1 }}
      />
    )
  }
  if (data.extract.transcript.length > 0) {
    return (
      <Stack gap={1.5} sx={{ p: 2, overflow: 'auto' }}>
        <Typography variant="subtitle2">Call transcript</Typography>
        {data.extract.transcript.map((line, index) => (
          <Box key={index}>
            <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
              {line.at} · {line.speaker}
            </Typography>
            <Typography variant="body2">{line.text}</Typography>
          </Box>
        ))}
      </Stack>
    )
  }
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, p: 3 }} gap={1}>
      <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
        This CC link cannot be shown here.
      </Typography>
      <Button href={data.cc.link} target="_blank" rel="noreferrer">
        Open it in a new tab
      </Button>
    </Stack>
  )
}

export default CcVerification
