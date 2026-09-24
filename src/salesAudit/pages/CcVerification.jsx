import { useCallback, useMemo } from 'react'
import { Box, Grid } from '@mui/material'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import RecordPanel from '../components/ccVerification/RecordPanel'
import SourcePdfPanel from '../components/ccVerification/SourcePdfPanel'
import { getCcVerification, getStudent } from '../apiCalls/salesAuditApi'
import { useApi } from '../utils/useApi'
import { getValueAtPath } from '../utils/compareLeadData'
import {
  COURSE_FIELDS,
  PERSONAL_FIELDS,
  getInstallmentCount,
  getPaymentFields,
} from '../utils/compareFields'
import { paths } from '../utils/routePaths'
import { checkLeadAccess, useCurrentUser } from '../utils/roles'

function toRows(record, fields) {
  return fields.map(({ key, label }) => ({
    key,
    label,
    value: String(getValueAtPath(record, key) ?? '').trim(),
  }))
}

function buildSections({ paymentMode, partialSplitUpCategory, system }) {
  const installmentCount = getInstallmentCount(paymentMode, partialSplitUpCategory)
  return [
    { title: 'Personal Details', rows: toRows(system, PERSONAL_FIELDS) },
    { title: 'Course Details', rows: toRows(system, COURSE_FIELDS) },
    {
      title: 'Payment Details',
      rows: toRows(system, getPaymentFields(paymentMode, installmentCount)),
    },
  ]
}

// Check source PDF: the database record on the left, the CC PDF (confirmationCallLink) on the
// right.
function CcVerification() {
  const { studentId } = useParams()
  const user = useCurrentUser()
  const fetchVerification = useCallback(
    (token) =>
      Promise.all([getCcVerification(token, studentId), getStudent(token, studentId)]).then(
        ([verification, student]) => {
          checkLeadAccess(user, student)
          return verification
        },
      ),
    [studentId, user],
  )
  const { data, loading, error, reload } = useApi(fetchVerification)

  const sections = useMemo(() => (data ? buildSections(data) : []), [data])

  return (
    <Box>
      <PageHeader
        title={data?.system.personal?.learnerName ?? 'Check source'}
        subtitle="Database record next to the confirmation-call source"
        backTo={paths.student(studentId)}
        backLabel="Student details"
      />

      <PageState loading={loading} error={error} onRetry={reload}>
        {data && (
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} md={5}>
              <RecordPanel sections={sections} />
            </Grid>
            <Grid
              item
              xs={12}
              md={7}
              sx={{
                position: { md: 'sticky' },
                top: { md: 80 },
                height: { xs: '80vh', md: 'calc(100vh - 110px)' },
              }}
            >
              <SourcePdfPanel url={data.pdfUrl} />
            </Grid>
          </Grid>
        )}
      </PageState>
    </Box>
  )
}

export default CcVerification
