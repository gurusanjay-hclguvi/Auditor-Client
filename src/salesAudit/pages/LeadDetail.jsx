import { useCallback, useState } from 'react'
import { Alert, Box, Button, Chip, Snackbar, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import { SectionCard } from '../components/common/SectionCard'
import { AuditStatusChip, CcStatusChip, RecheckStatusChip } from '../components/common/Chips'
import { ReasonList } from '../components/rechecks/RecheckReasons'
import { CcUpdatedChip } from '../components/rechecks/CcTicketAlert'
import {
  AdmissionSection,
  CourseSection,
  PaymentSection,
  PersonalSection,
} from '../components/leads/LeadSections'
import LeadTimeline from '../components/leads/LeadTimeline'
import ReassignDialog from '../components/dialogs/ReassignDialog'
import CloseRecheckDialog from '../components/dialogs/CloseRecheckDialog'
import { getLead, getTimeline, sendReminder, takeUpLead } from '../apiCalls/salesAuditApi'
import { MUTED_TEXT } from '../styles/tableSx'
import { ASSIGN_MODE_LABELS } from '../utils/labels'
import { formatDateTime } from '../utils/formatters'
import { paths } from '../utils/routePaths'
import { getRoleHome, isAuditRole, useCanWrite, useCurrentUser } from '../utils/roles'
import { useAction } from '../utils/useAction'
import { useApi } from '../utils/useApi'

const loadLeadPage = (leadId) => (token) =>
  Promise.all([getLead(token, leadId), getTimeline(token, leadId)]).then(([detail, events]) => ({
    ...detail,
    events,
  }))

// Everything about one lead: its details in four sections, where its audit stands, its rechecks
// and the timeline from lead in to audit completed.
function LeadDetail() {
  const { leadId } = useParams()
  const { data, loading, error, reload } = useApi(
    useCallback((token) => loadLeadPage(leadId)(token), [leadId]),
  )
  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      {data && <LeadPage data={data} reload={reload} />}
    </PageState>
  )
}

function LeadPage({ data, reload }) {
  const user = useCurrentUser()
  const canWrite = useCanWrite()
  const [reassigning, setReassigning] = useState(false)
  const [closing, setClosing] = useState(null)
  const [notice, setNotice] = useState(null)
  const reminder = useAction(sendReminder)
  const takeUp = useAction(takeUpLead)
  const auditRole = isAuditRole(user.role)
  const { lead, rechecks, audits, actions, events } = data
  const openRecheck = rechecks.find((recheck) => recheck.status === 'open')

  return (
    <>
      <PageHeader
        title={lead.personal.name || lead.personal.email}
        subtitle={`Zen ID ${lead.zenId} · ${lead.region || 'No region'}`}
        backTo={auditRole ? paths.leads : getRoleHome(user.role)}
        backLabel={auditRole ? 'All leads' : 'Back'}
        action={
          <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
            {actions.canAudit && lead.audit.status !== 'completed' && (
              <Button variant="contained" component={RouterLink} to={paths.leadAudit(lead.id)}>
                {actions.canReaudit ? 'Audit again' : 'Audit'}
              </Button>
            )}
            {canWrite && actions.canTakeUp && (
              <Button
                variant="outlined"
                disabled={takeUp.busy}
                onClick={async () =>
                  (await takeUp.run(lead.id)) && (setNotice('The lead is now yours'), reload())
                }
              >
                Take up
              </Button>
            )}
            {canWrite && actions.canReassign && (
              <Button variant="outlined" onClick={() => setReassigning(true)}>
                Reassign
              </Button>
            )}
            {canWrite && auditRole && !lead.payment.ready && lead.audit.status !== 'completed' && (
              <Button
                variant="outlined"
                color="warning"
                disabled={reminder.busy}
                onClick={async () =>
                  (await reminder.run(lead.id)) &&
                  setNotice('Reminder mailed to the BDA, BDM and Accounts')
                }
              >
                Send payment reminder
              </Button>
            )}
          </Stack>
        }
      />
      {(reminder.error || takeUp.error) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {reminder.error || takeUp.error}
        </Alert>
      )}

      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mb: 3 }}>
        <AuditStatusChip status={lead.audit.status} />
        <CcStatusChip status={lead.cc.status} />
        {lead.assignment && (
          <Chip
            size="small"
            variant="outlined"
            label={`Auditor: ${lead.assignment.auditorEmail} (${ASSIGN_MODE_LABELS[lead.assignment.mode] ?? lead.assignment.mode})`}
          />
        )}
        {lead.audit.completedAt > 0 && (
          <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
            Completed {formatDateTime(lead.audit.completedAt)} by {lead.audit.completedBy}
          </Typography>
        )}
      </Stack>
      {openRecheck && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Recheck {openRecheck.recheckNo} is open ({openRecheck.comments}). The BDA fixes it and
          closes the ticket.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Stack gap={3}>
          <PersonalSection lead={lead} />
          <CourseSection lead={lead} />
          <PaymentSection lead={lead} />
          <AdmissionSection lead={lead} />
        </Stack>
        <Stack gap={3}>
          <SectionCard title="Timeline">
            <LeadTimeline events={events} />
          </SectionCard>
          <SectionCard title={`Rechecks (${rechecks.length})`}>
            {rechecks.length === 0 ? (
              <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
                No rechecks on this lead.
              </Typography>
            ) : (
              <Stack gap={2}>
                {rechecks.map((recheck) => (
                  <Box key={recheck.id}>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {recheck.recheckNo}
                      </Typography>
                      <RecheckStatusChip recheck={recheck} />
                      <CcUpdatedChip recheck={recheck} />
                    </Stack>
                    <Box sx={{ mt: 1 }}>
                      <ReasonList recheck={recheck} />
                    </Box>
                    <Typography variant="caption" sx={{ color: MUTED_TEXT, display: 'block' }}>
                      Raised {formatDateTime(recheck.raisedAt)} by{' '}
                      {recheck.raisedBy?.name || recheck.raisedBy?.email}
                      {recheck.closed &&
                        ` · closed ${formatDateTime(recheck.closed.at)} by ${recheck.closed.by?.name || recheck.closed.by?.email}: ${recheck.closed.note}`}
                    </Typography>
                    {canWrite &&
                      recheck.status === 'open' &&
                      (auditRole || user.role === 'bdm' || recheck.bdaEmail === user.email) && (
                        <Button size="small" sx={{ mt: 0.5 }} onClick={() => setClosing(recheck)}>
                          Close ticket
                        </Button>
                      )}
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
          <SectionCard title={`Audits (${audits.length})`}>
            {audits.length === 0 ? (
              <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
                Not audited yet.
              </Typography>
            ) : (
              <Stack gap={1.5}>
                {audits.map((audit) => (
                  <Box key={audit.id}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Attempt {audit.attempt}:{' '}
                      {audit.outcome === 'completed' ? 'completed' : 'recheck raised'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: MUTED_TEXT }}>
                      {formatDateTime(audit.submittedAt)} ·{' '}
                      {audit.auditor?.name || audit.auditor?.email}
                      {audit.mismatchCount ? ` · ${audit.mismatchCount} CC mismatch(es)` : ''}
                      {audit.comments ? ` · ${audit.comments}` : ''}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Stack>
      </Box>

      <ReassignDialog
        open={reassigning}
        lead={lead}
        onClose={() => setReassigning(false)}
        onReassigned={(updated) => {
          setNotice(`Reassigned to ${updated.assignment.auditorEmail}`)
          reload()
        }}
      />
      <CloseRecheckDialog
        recheck={closing}
        onClose={() => setClosing(null)}
        onClosed={(recheck) => {
          setNotice(`${recheck.recheckNo} closed`)
          reload()
        }}
      />
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </>
  )
}

export default LeadDetail
