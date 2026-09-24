import { useCallback, useMemo } from 'react'
import { Box, Chip, Divider, Stack } from '@mui/material'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import PageState from '../components/common/PageState'
import ComparisonPanel from '../components/comparison/ComparisonPanel'
import { getCcVerification } from '../apiCalls/salesAuditApi'
import { useApi } from '../utils/useApi'
import { compareLeadData } from '../utils/compareLeadData'
import {
  COURSE_FIELDS,
  PERSONAL_FIELDS,
  getInstallmentCount,
  getPaymentFields,
} from '../utils/compareFields'
import { paths } from '../utils/routePaths'

function buildSections({ paymentMode, partialSplitUpCategory, system, scraped }) {
  const installmentCount = getInstallmentCount(paymentMode, partialSplitUpCategory)
  return [
    { title: 'Personal Details', rows: compareLeadData(system, scraped, PERSONAL_FIELDS) },
    { title: 'Course Details', rows: compareLeadData(system, scraped, COURSE_FIELDS) },
    {
      title: 'Payment Details',
      rows: compareLeadData(system, scraped, getPaymentFields(paymentMode, installmentCount)),
    },
  ]
}

function CcVerification() {
  const { studentId } = useParams()
  const fetchVerification = useCallback(
    (token) => getCcVerification(token, studentId),
    [studentId],
  )
  const { data, loading, error, reload } = useApi(fetchVerification)

  const sections = useMemo(() => (data ? buildSections(data) : []), [data])
  const mismatchCount = sections.reduce(
    (total, section) => total + section.rows.filter((row) => !row.matches).length,
    0,
  )

  return (
    <Box>
      <PageHeader
        title={data?.system.personal.learnerName ?? 'CC Verification'}
        subtitle="Lead record vs. the scraped confirmation-call PDF"
        backTo={paths.student(studentId)}
        backLabel="Student details"
        action={
          data && (
            <Chip
              label={
                mismatchCount === 0
                  ? 'All fields match'
                  : `${mismatchCount} field${mismatchCount === 1 ? '' : 's'} flagged`
              }
              color={mismatchCount === 0 ? 'success' : 'warning'}
            />
          )
        }
      />

      <PageState
        loading={loading}
        loadingMessage="Scraping CC PDF..."
        error={error}
        onRetry={reload}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          divider={<Divider orientation="vertical" flexItem />}
        >
          <ComparisonPanel
            title="System Data"
            subtitle="From the lead record"
            sections={sections}
            valueKey="systemValue"
          />
          <ComparisonPanel
            title="Scraped PDF Data"
            subtitle="Extracted from the CC document"
            sections={sections}
            valueKey="scrapedValue"
          />
        </Stack>
      </PageState>
    </Box>
  )
}

export default CcVerification
