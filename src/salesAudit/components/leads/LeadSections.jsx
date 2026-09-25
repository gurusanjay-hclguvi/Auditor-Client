import {
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { FieldGrid, SectionCard } from '../common/SectionCard'
import { PaymentReadyChip } from '../common/Chips'
import { MUTED_TEXT, bodyCellSx, headCellSx } from '../../styles/tableSx'
import {
  formatCurrency,
  formatDateTime,
  formatProduct,
  formatZohoDate,
  humanizeKey,
  orEmpty,
} from '../../utils/formatters'

// The lead's details in the four groups the auditor checks: personal, course, payment + discount,
// admission & terms.

function MiniTable({ columns, rows, empty }) {
  if (!rows.length) {
    return (
      <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
        {empty}
      </Typography>
    )
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {columns.map(([label]) => (
            <TableCell key={label} sx={headCellSx}>
              {label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.recordId || index}>
            {columns.map(([label, render]) => (
              <TableCell key={label} sx={bodyCellSx}>
                {render(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function PersonalSection({ lead }) {
  return (
    <SectionCard title="Personal details">
      <FieldGrid
        fields={[
          ['Name', lead.personal.name],
          ['Email', lead.personal.email],
          ['Phone', lead.personal.phone],
          ['Preferred language', lead.personal.preferredLanguage],
          ['Zen ID', lead.zenId],
          ['Superleap ID', lead.superleapId],
          ['Region', lead.region],
          ['BDA', lead.bdaEmail],
          ['BDM', lead.bdmEmail],
          ['Onboarding coordinator', lead.onboardCoordinator],
          ['Source', [lead.marketing.source, lead.marketing.medium].filter(Boolean).join(' · ')],
          ['Zoho stage', lead.stage],
        ]}
      />
    </SectionCard>
  )
}

export function CourseSection({ lead }) {
  const { course } = lead
  return (
    <SectionCard title="Course details">
      <FieldGrid
        fields={[
          ['Course', formatProduct(course.product)],
          ['Mode of study', course.modeOfStudy],
          ['Batch', course.batch.name],
          ['Batch type', course.batch.type],
          ['Batch language', course.batch.language],
          ['Batch start', formatZohoDate(course.batch.startDate)],
          ['Batch end', formatZohoDate(course.batch.endDate)],
          ['Class time', course.batch.startTime],
          ['Enrolled on', formatZohoDate(course.enrolledOn)],
          ['Onboarded at', course.onboardingAt ? formatDateTime(course.onboardingAt) : ''],
        ]}
      />
    </SectionCard>
  )
}

export function PaymentSection({ lead }) {
  const { payment } = lead
  return (
    <SectionCard title="Payment & discount details" action={<PaymentReadyChip payment={payment} />}>
      <Stack gap={2.5}>
        <FieldGrid
          fields={[
            ['Payment type', payment.paymentType],
            ['Partial split', payment.partialCategory],
            ['Course fee', formatCurrency(payment.courseFee)],
            ['Total paid', formatCurrency(payment.totalPaid)],
            ['Verified amount', formatCurrency(payment.verifiedAmount)],
            ['Balance', formatCurrency(payment.balanceAmount)],
            ['Promo code', payment.promoCode],
            ['Pays in same month', payment.payInSameMonth],
            ['Zoho Books invoice', payment.zbInvoiceId],
          ]}
        />
        {!payment.ready && (
          <Typography variant="body2" color="warning.main">
            {payment.shortfall}
          </Typography>
        )}
        <div>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Payments
          </Typography>
          <MiniTable
            empty="No payments yet."
            rows={payment.records}
            columns={[
              ['Type', (row) => row.type],
              ['Amount', (row) => formatCurrency(row.amount)],
              ['Mode', (row) => orEmpty(row.modeOfPayment)],
              ['UTR / payment ID', (row) => orEmpty(row.utrPaymentId)],
              ['Paid on', (row) => formatZohoDate(row.paymentDate)],
              [
                'Verified',
                (row) => (
                  <Chip
                    size="small"
                    label={row.verified || 'Not verified'}
                    color={row.verified === 'Yes' ? 'success' : 'warning'}
                    variant="outlined"
                  />
                ),
              ],
              ['Verified on', (row) => formatZohoDate(row.verifiedDate)],
            ]}
          />
        </div>
        <div>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Discounts
          </Typography>
          <MiniTable
            empty="No discount requested."
            rows={payment.discounts}
            columns={[
              ['Actual fee', (row) => formatCurrency(row.actualCourseFee)],
              ['Requested fee', (row) => formatCurrency(row.requestedCourseFee)],
              ['Discount', (row) => formatCurrency(row.discountValue)],
              ['Requested by', (row) => orEmpty(row.requestedBy)],
              ['Status', (row) => orEmpty(row.status)],
            ]}
          />
        </div>
        {payment.emis.length > 0 && (
          <div>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              EMI
            </Typography>
            <MiniTable
              rows={payment.emis}
              columns={[
                ['Vendor', (row) => orEmpty(row.vendor)],
                ['Application', (row) => orEmpty(row.applicationId)],
                ['Loan', (row) => formatCurrency(row.loanAmount)],
                ['Tenure', (row) => (row.tenorMonths ? `${row.tenorMonths} months` : '—')],
                ['First EMI', (row) => formatCurrency(row.firstEmiAmount)],
                ['Status', (row) => [row.status, row.stage].filter(Boolean).join(' · ') || '—'],
              ]}
            />
          </div>
        )}
        {payment.partialReminders.length > 0 && (
          <div>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Partial payments
            </Typography>
            <MiniTable
              rows={payment.partialReminders}
              columns={[
                ['Part', (row) => orEmpty(row.noOfPartial)],
                ['Amount', (row) => formatCurrency(row.amount)],
                ['Due', (row) => formatZohoDate(row.dueDate)],
                ['Status', (row) => orEmpty(row.status)],
                ['Paid at', (row) => formatZohoDate(row.paidAt)],
              ]}
            />
          </div>
        )}
        {payment.subscriptions.length > 0 && (
          <div>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Subscriptions
            </Typography>
            <MiniTable
              rows={payment.subscriptions}
              columns={[
                ['No.', (row) => orEmpty(row.noOfSubscription)],
                ['Amount', (row) => formatCurrency(row.amount)],
                ['Due', (row) => formatZohoDate(row.dueDate)],
                ['Status', (row) => orEmpty(row.status)],
              ]}
            />
          </div>
        )}
      </Stack>
    </SectionCard>
  )
}

export function AdmissionSection({ lead }) {
  const entries = Object.entries(lead.admission ?? {}).sort(([a], [b]) => a.localeCompare(b))
  return (
    <SectionCard
      title="Admission & terms and conditions"
      action={
        <Chip
          size="small"
          label={lead.termsAccepted ? 'T&C accepted' : 'T&C not accepted'}
          color={lead.termsAccepted ? 'success' : 'error'}
          variant="outlined"
        />
      }
    >
      {entries.length ? (
        <FieldGrid fields={entries.map(([key, value]) => [humanizeKey(key), value])} />
      ) : (
        <Typography variant="body2" sx={{ color: MUTED_TEXT }}>
          The admission form has not been filled.
        </Typography>
      )}
    </SectionCard>
  )
}
