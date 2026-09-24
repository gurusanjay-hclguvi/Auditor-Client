import { useCallback, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, Grid, Snackbar, Stack } from '@mui/material'
import {
  FactCheckOutlined as FactCheckOutlinedIcon,
  VerifiedRounded as VerifiedRoundedIcon,
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { Link as RouterLink, useParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import PaymentStrip from '../components/audit/PaymentStrip'
import SourceComparison from '../components/audit/SourceComparison'
import AuditChecklist from '../components/audit/AuditChecklist'
import MarkVerifiedDialog from '../components/audit/MarkVerifiedDialog'
import RaiseRecheckDialog from '../components/rechecks/RaiseRecheckDialog'
import { getLeadAudit, markLeadAudited, raiseRecheck } from '../apiCalls/salesAuditApi'
import { useApi } from '../utils/useApi'
import { buildAuditSections, buildChecklist, checklistPasses } from '../utils/auditChecks'
import { LEAD_STAGES, getLeadStage, getSapAgeMs, isSapOverdue } from '../utils/leadStatus'
import { contactName, formatDateTime, formatDuration } from '../utils/formatters'
import { paths } from '../utils/routePaths'

// Lead Audit Workspace: everything the auditor checks for one lead, on one screen.
function LeadAudit() {
  const { studentId } = useParams()
  const token = useSelector((state) => state.reducers.commonData.authToken)
  const canEdit = useSelector((state) =>
    Boolean(state.reducers.commonData.permission.salesAudit?.write),
  )
  const fetchAudit = useCallback((authToken) => getLeadAudit(authToken, studentId), [studentId])
  const { data, loading, error, reload } = useApi(fetchAudit)

  const [now] = useState(() => Date.now())
  const [recheckPrefill, setRecheckPrefill] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [toast, setToast] = useState(null)

  const view = useMemo(() => {
    if (!data) return null
    const built = buildAuditSections(data)
    const openRechecks = data.rechecks.filter((recheck) => recheck.status === 'open')
    const checklist = buildChecklist(data, built, openRechecks)
    return { ...built, checklist, passes: checklistPasses(checklist) }
  }, [data])

  const lead = data?.lead
  const audited = lead && getLeadStage(lead) === LEAD_STAGES.awaiting

  async function handleRaise(recheck) {
    await raiseRecheck(token, recheck)
    setRecheckPrefill(null)
    setToast(
      `Recheck raised. Alerted BDA ${contactName(lead.saleOwner)} and BDM ${contactName(
        lead.saleOwnerManager,
      )}.`,
    )
    reload()
  }

  async function handleVerify(overrideReason) {
    await markLeadAudited(token, lead.id, { overrideReason })
    setVerifying(false)
    setToast(`${lead.studentFullName} verified and moved to Awaiting.`)
    reload()
  }

  const verifyButton =
    lead && !audited && canEdit ? (
      <Button
        fullWidth
        variant="contained"
        color={view?.passes ? 'primary' : 'warning'}
        startIcon={<VerifiedRoundedIcon />}
        onClick={() => setVerifying(true)}
      >
        {view?.passes ? 'Mark verified → Awaiting' : 'Verify with override…'}
      </Button>
    ) : null

  return (
    <Box>
      <PageHeader
        title={lead ? `Audit · ${lead.studentFullName}` : 'Audit'}
        subtitle={lead && `${lead.course} · ${lead.paymentType}`}
        backTo={paths.leads(audited ? 'awaiting' : 'pending')}
        backLabel="Leads"
        action={
          lead &&
          (audited ? (
            <Chip
              icon={<VerifiedRoundedIcon />}
              color="success"
              label={`Verified by ${lead.audit.auditedBy} · ${formatDateTime(
                lead.audit.auditedAt,
              )}`}
            />
          ) : (
            <Chip
              color={isSapOverdue(lead, now) ? 'error' : 'default'}
              variant="outlined"
              label={`In Sales Action Pending · ${formatDuration(getSapAgeMs(lead, now))}`}
            />
          ))
        }
      />

      <PageState loading={loading} error={error} onRetry={reload}>
        {view && (
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Chip label={`BDA: ${contactName(lead.saleOwner)}`} variant="outlined" />
              <Chip label={`BDM: ${contactName(lead.saleOwnerManager)}`} variant="outlined" />
              {data.vendorName && (
                <Chip label={`EMI vendor: ${data.vendorName}`} variant="outlined" />
              )}
              <Box sx={{ flex: 1 }} />
              <Button component={RouterLink} to={paths.student(lead.id)} size="small">
                Lead details
              </Button>
              <Button component={RouterLink} to={paths.studentPayments(lead.id)} size="small">
                All payments
              </Button>
              {lead.confirmationCallLink && (
                <Button
                  component={RouterLink}
                  to={paths.ccVerification(lead.id)}
                  size="small"
                  startIcon={<FactCheckOutlinedIcon />}
                >
                  CC side by side
                </Button>
              )}
            </Stack>

            {audited && lead.audit.overrideReason && (
              <Alert severity="info">Verified with an override: {lead.audit.overrideReason}</Alert>
            )}

            <Grid container spacing={2.5} alignItems="flex-start">
              <Grid item xs={12} md={8}>
                <Stack spacing={2.5}>
                  <PaymentStrip lead={lead} />
                  <SourceComparison
                    sections={view.sections}
                    sourceList={view.sourceList}
                    canEdit={canEdit}
                    onRaise={setRecheckPrefill}
                  />
                </Stack>
              </Grid>
              <Grid item xs={12} md={4} sx={{ position: { md: 'sticky' }, top: { md: 80 } }}>
                <AuditChecklist
                  items={view.checklist}
                  canEdit={canEdit}
                  onRaise={setRecheckPrefill}
                  footer={verifyButton}
                />
              </Grid>
            </Grid>
          </Stack>
        )}
      </PageState>

      {recheckPrefill && (
        <RaiseRecheckDialog
          open
          leads={[lead]}
          initialValues={{ leadId: lead.id, ...recheckPrefill }}
          onClose={() => setRecheckPrefill(null)}
          onSubmit={handleRaise}
        />
      )}
      {verifying && (
        <MarkVerifiedDialog
          leadName={lead.studentFullName}
          failingItems={view.checklist.filter((item) => item.status === 'fail')}
          onClose={() => setVerifying(false)}
          onConfirm={handleVerify}
        />
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default LeadAudit
