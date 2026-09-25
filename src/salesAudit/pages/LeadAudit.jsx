import { useCallback, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import { AuditStatusChip, CcStatusChip, MatchChip } from '../components/common/Chips'
import ChecklistDialog from '../components/dialogs/ChecklistDialog'
import RaiseRecheckDialog from '../components/dialogs/RaiseRecheckDialog'
import { getAuditView } from '../apiCalls/salesAuditApi'
import { MUTED_TEXT, bodyCellSx, headCellSx } from '../styles/tableSx'
import { CC_TYPE_LABELS } from '../utils/labels'
import { EMPTY_VALUE, formatDateTime } from '../utils/formatters'
import { paths } from '../utils/routePaths'
import { useCanWrite } from '../utils/roles'
import { useApi } from '../utils/useApi'

const SECTION_LABELS = {
  personal: 'Personal details',
  course: 'Course details',
  payment: 'Payment details',
}

// The audit: our database on the left, what the CC (confirmation call or PDF) says on the right,
// and whether each field matches. From here the auditor completes the audit with the checklist or
// raises a recheck.
function LeadAudit() {
  const { leadId } = useParams()
  const { data, loading, error, reload } = useApi(
    useCallback((token) => getAuditView(token, leadId), [leadId]),
  )
  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      {data && <AuditWorkspace view={data} reload={reload} />}
    </PageState>
  )
}

function AuditWorkspace({ view, reload }) {
  const navigate = useNavigate()
  const canWrite = useCanWrite()
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [recheckOpen, setRecheckOpen] = useState(false)
  const [notice, setNotice] = useState(null)
  const { lead, cc, comparison, mismatchCount, pointsCovered, checklist, rechecks, actions } = view
  const openRecheck = rechecks.find((recheck) => recheck.status === 'open')
  const lastClosed = rechecks.find((recheck) => recheck.status === 'closed' && !recheck.reauditedAt)
  const sections = Object.keys(SECTION_LABELS).filter((section) =>
    comparison.some((row) => row.section === section),
  )

  return (
    <>
      <PageHeader
        title={`Audit · ${lead.personal.name}`}
        subtitle={`Zen ID ${lead.zenId} · attempt ${lead.audit.attempt + 1}`}
        backTo={paths.lead(lead.id)}
        backLabel="Lead details"
        action={
          <Stack direction="row" gap={1}>
            <Button
              variant="outlined"
              component={RouterLink}
              to={paths.ccVerification(lead.id)}
              disabled={cc.status !== 'updated'}
            >
              CC verify
            </Button>
            {canWrite && actions.canRaiseRecheck && (
              <Button variant="outlined" color="warning" onClick={() => setRecheckOpen(true)}>
                Recheck
              </Button>
            )}
            {canWrite && (
              <Button
                variant="contained"
                color="success"
                disabled={!actions.canComplete}
                onClick={() => setChecklistOpen(true)}
              >
                Checklist
              </Button>
            )}
          </Stack>
        }
      />

      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
        <AuditStatusChip status={lead.audit.status} />
        <CcStatusChip status={cc.status} />
        {cc.type && (
          <Chip size="small" variant="outlined" label={CC_TYPE_LABELS[cc.type] ?? cc.type} />
        )}
        <Chip
          size="small"
          color={mismatchCount ? 'error' : 'success'}
          label={mismatchCount ? `${mismatchCount} mismatch(es)` : 'Everything matches'}
        />
      </Stack>

      {lastClosed && lead.audit.status === 'recheckClosed' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Recheck {lastClosed.recheckNo} was closed {formatDateTime(lastClosed.closed?.at)} by{' '}
          {lastClosed.closed?.by?.name || lastClosed.closed?.by?.email}: {lastClosed.closed?.note}.
          The lead can be audited again.
        </Alert>
      )}
      {openRecheck && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Recheck {openRecheck.recheckNo} is open; the audit can continue once the BDA closes it.
        </Alert>
      )}
      {actions.blockedReason && !openRecheck && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {actions.blockedReason}
        </Alert>
      )}
      {cc.status !== 'updated' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The CC is not updated in Zoho yet, so there is nothing to compare. You are alerted when it
          arrives.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '3fr 1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headCellSx}>Field</TableCell>
                <TableCell sx={headCellSx}>Our database</TableCell>
                <TableCell sx={headCellSx}>From the CC</TableCell>
                <TableCell sx={headCellSx}>Result</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sections.map((section) => [
                <TableRow key={section}>
                  <TableCell colSpan={4} sx={{ bgcolor: '#F6F8FB', fontWeight: 700 }}>
                    {SECTION_LABELS[section]}
                  </TableCell>
                </TableRow>,
                ...comparison
                  .filter((row) => row.section === section)
                  .map((row) => (
                    <TableRow key={row.key} sx={row.match ? undefined : { bgcolor: '#FFF4F4' }}>
                      <TableCell sx={{ ...bodyCellSx, color: MUTED_TEXT }}>{row.label}</TableCell>
                      <TableCell sx={bodyCellSx}>{row.dbValue || EMPTY_VALUE}</TableCell>
                      <TableCell sx={bodyCellSx}>{row.ccValue || EMPTY_VALUE}</TableCell>
                      <TableCell sx={bodyCellSx}>
                        <MatchChip match={row.match} />
                      </TableCell>
                    </TableRow>
                  )),
              ])}
            </TableBody>
          </Table>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Points covered in the CC
          </Typography>
          {pointsCovered.length === 0 ? (
            <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
              Nothing read from the CC yet.
            </Typography>
          ) : (
            <Stack gap={0.5}>
              {pointsCovered.map((point) => (
                <Typography key={point} variant="body2">
                  ✓ {point}
                </Typography>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>

      <ChecklistDialog
        open={checklistOpen}
        lead={lead}
        checklist={checklist}
        mismatchCount={mismatchCount}
        onClose={() => setChecklistOpen(false)}
        onCompleted={() => navigate(paths.lead(lead.id))}
      />
      <RaiseRecheckDialog
        open={recheckOpen}
        lead={lead}
        onClose={() => setRecheckOpen(false)}
        onRaised={(recheck) => {
          setNotice(`Recheck ${recheck.recheckNo} raised; the BDA and BDM were alerted`)
          reload()
        }}
      />
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={5000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </>
  )
}

export default LeadAudit
