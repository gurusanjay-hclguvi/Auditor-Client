import {
  COURSE_FIELDS,
  EMI_FIELDS,
  PERSONAL_FIELDS,
  getInstallmentCount,
  getPaymentFields,
} from './compareFields'
import { getValueAtPath } from './compareLeadData'
import { getCreditStatus } from './leadStatus'
import { RECHECK_CATEGORIES, getCcStatus } from './recheckStatus'
import { formatCurrency } from './formatters'
import { paths } from './routePaths'

// Lead Audit Workspace logic: compare Zoho, the CC mail and the EMI vendor field by field, tick
// the audit checklist, and turn any failure into a pre-filled recheck.
// audit: { lead, sources: { zoho, cc, vendor }, paymentMode, partialSplitUpCategory,
//          pointsCovered }, where cc / vendor are null when that source doesn't exist.

export const AUDIT_SOURCES = { zoho: 'Zoho', cc: 'CC mail', vendor: 'EMI vendor' }

// What every CC mail must tell the learner.
export const REQUIRED_CC_POINTS = {
  fee: 'Total fee',
  paymentPlan: 'Payment plan (split or EMI terms)',
  startDate: 'Batch start date',
  batchTiming: 'Batch timing and mode',
  medium: 'Medium of instruction',
  refundPolicy: 'Refund policy',
}

// `info` rows are shown side by side but not compared (sources use different vocabularies).
const EMI_EXTRA_FIELDS = [
  { key: 'payment.emi.tenure', label: 'Tenure' },
  { key: 'payment.emi.disbursalStatus', label: 'Loan status', info: true },
]

export const isEmiPaymentType = (paymentType) => /EMI/.test(paymentType ?? '')

// Lead payment type -> the CC comparison's payment mode (utils/compareFields.js).
export function getPaymentMode(paymentType = '') {
  if (paymentType === 'EMI + Partial Payment') return 'emiPartial'
  if (/^EMI/.test(paymentType)) return 'emi'
  if (paymentType === 'Direct - Partial Payment') return 'partial'
  if (paymentType === 'Subscription') return 'subscription'
  return 'full'
}

const display = (value) => (value == null ? '' : String(value).trim())
const normalize = (value) => display(value).toLowerCase().replace(/[\s,]/g, '')

export function getSourceList(audit) {
  return Object.entries(AUDIT_SOURCES)
    .filter(([key]) => audit.sources[key])
    .map(([key, label]) => ({ key, label, data: audit.sources[key] }))
}

// Row status: match (all present sources agree), mismatch, single (only one source has it) or
// info (shown, not compared). Rows no source has are dropped.
function compareSources(sourceList, fields) {
  return fields
    .map(({ key, label, info }) => {
      const values = Object.fromEntries(
        sourceList.map((source) => [source.key, display(getValueAtPath(source.data, key))]),
      )
      const present = sourceList.filter((source) => values[source.key] !== '')
      const distinct = new Set(present.map((source) => normalize(values[source.key])))
      let status = distinct.size <= 1 ? 'match' : 'mismatch'
      if (present.length === 0) status = 'empty'
      else if (info || present.length === 1) status = info ? 'info' : 'single'
      return { key, label, values, status }
    })
    .filter((row) => row.status !== 'empty')
}

export function buildAuditSections(audit) {
  const sourceList = getSourceList(audit)
  const { paymentMode, partialSplitUpCategory, lead } = audit
  const paymentFields = getPaymentFields(
    paymentMode,
    getInstallmentCount(paymentMode, partialSplitUpCategory),
  ).filter((field) => !field.key.startsWith('payment.emi.'))

  const sections = [
    { key: 'personal', title: 'Personal details', fields: PERSONAL_FIELDS },
    { key: 'course', title: 'Course details', fields: COURSE_FIELDS },
    { key: 'payment', title: 'Payment details', fields: paymentFields },
  ]
  if (isEmiPaymentType(lead.paymentType)) {
    sections.push({
      key: 'emi',
      title: 'EMI details',
      fields: [...EMI_FIELDS, ...EMI_EXTRA_FIELDS],
    })
  }

  return {
    sourceList,
    sections: sections
      .map((section) => ({ ...section, rows: compareSources(sourceList, section.fields) }))
      .filter((section) => section.rows.length > 0),
  }
}

// ---- Mismatch -> recheck --------------------------------------------------------------------

function categoryForField(fieldKey) {
  if (fieldKey.startsWith('payment.emi.')) return 'emi'
  if (fieldKey === 'payment.downPayment') return 'downPayment'
  if (fieldKey.startsWith('payment.')) return 'payment'
  return 'missedPointsInCc'
}

// "Second Partial - Amount: Zoho says ₹22000, CC mail says ₹22500"
function describeRow(row, sourceList) {
  const said = sourceList
    .filter((source) => row.values[source.key])
    .map((source) => `${source.label} says ${row.values[source.key]}`)
  return `${row.label}: ${said.join(', ')}`
}

export function recheckForRow(row, sourceList) {
  return { category: categoryForField(row.key), notes: `${describeRow(row, sourceList)}.` }
}

function recheckForRows(rows, sourceList) {
  return {
    category: categoryForField(rows[0].key),
    notes: rows.map((row) => `${describeRow(row, sourceList)}.`).join('\n'),
  }
}

// ---- Checklist ------------------------------------------------------------------------------

const pass = (reason) => ({ status: 'pass', reason })
const notApplicable = (reason) => ({ status: 'na', reason })
const fail = (reason, extra = {}) => ({ status: 'fail', reason, ...extra })

function creditCheck(lead, key, label, { required, naReason }) {
  const credit = lead.credits?.[key]
  const amount = credit ? formatCurrency(credit.amount) : ''
  const category = key === 'bookingAmount' ? 'downPayment' : 'payment'
  switch (getCreditStatus(credit)) {
    case 'verified':
      return pass(`${amount} verified by Accounts`)
    case 'refund':
      return notApplicable(`${amount} refunded`)
    case 'mismatch':
      return fail(`${amount} marked as a mismatch by Accounts`, {
        recheck: { category, notes: `${label} of ${amount} is marked as a mismatch by Accounts.` },
      })
    case 'unverified':
      return fail(`${amount} received but not verified by Accounts`, {
        recheck: { category, notes: `${label} of ${amount} was received but is not verified.` },
      })
    default:
      return required
        ? fail('Not paid yet', {
            recheck: {
              category,
              notes: `No ${label.toLowerCase()} has been recorded for this lead.`,
            },
          })
        : notApplicable(naReason)
  }
}

// Rows where two named sources both have a value and disagree.
const disagreeing = (rows, a, b) =>
  rows.filter(
    (row) =>
      row.status !== 'info' &&
      row.values[a] &&
      row.values[b] &&
      normalize(row.values[a]) !== normalize(row.values[b]),
  )

const labelList = (rows) => rows.map((row) => row.label).join(', ')
const countLabel = (count) => (count === 1 ? '1 field differs' : `${count} fields differ`)

// Each item: { key, label, status: 'pass' | 'fail' | 'na', reason, recheck?, link? }.
export function buildChecklist(audit, { sourceList, sections }, openRechecks) {
  const { lead, sources, pointsCovered } = audit
  const allRows = sections.flatMap((section) => section.rows)
  const emiRows = sections.find((section) => section.key === 'emi')?.rows ?? []
  // EMI-only plans are financed by the loan, and subscriptions are paid monthly, so neither has a
  // separate initial payment (Credit_Part1).
  const initialNa = /^EMI - /.test(lead.paymentType ?? '')
    ? 'Covered by the EMI loan'
    : lead.paymentType === 'Subscription'
      ? 'Paid as monthly subscriptions'
      : null

  const items = [
    {
      key: 'downPayment',
      label: 'Down payment verified',
      ...creditCheck(lead, 'bookingAmount', 'Down payment', { required: true }),
    },
    {
      key: 'initialPayment',
      label: 'Initial payment verified',
      ...creditCheck(lead, 'part1', 'Initial payment', {
        required: !initialNa,
        naReason: initialNa,
      }),
    },
    {
      key: 'remainingBalance',
      label: 'Remaining balance verified',
      ...creditCheck(lead, 'remainingBalance', 'Remaining balance', {
        required: false,
        naReason: 'Not due yet',
      }),
    },
  ]

  if (getCcStatus(lead) === 'completed') {
    items.push({
      key: 'ccUploaded',
      label: 'CC mail uploaded',
      ...pass('Confirmation mail is on file'),
    })
  } else {
    const response =
      lead.ccResponse?.response === 'mailNotSent'
        ? ' · BDA says the mail was not sent'
        : lead.ccResponse?.response === 'mailSentAwaitingAck'
          ? ' · BDA says it was sent, awaiting acknowledgement'
          : ''
    items.push({
      key: 'ccUploaded',
      label: 'CC mail uploaded',
      ...fail(`No CC mail uploaded${response}`, {
        recheck: {
          category: 'ccPending',
          notes: 'No confirmation call mail has been uploaded for this lead.',
        },
      }),
    })
  }

  if (!sources.cc) {
    items.push(
      { key: 'ccMatches', label: 'CC mail matches Zoho', ...notApplicable('No CC to compare') },
      { key: 'ccPoints', label: 'All required points in the CC', ...notApplicable('No CC to check') },
    )
  } else {
    const differing = disagreeing(allRows, 'zoho', 'cc')
    items.push({
      key: 'ccMatches',
      label: 'CC mail matches Zoho',
      ...(differing.length
        ? fail(`${countLabel(differing.length)}: ${labelList(differing)}`, {
            recheck: recheckForRows(differing, sourceList),
          })
        : pass('Every field in the CC mail matches Zoho')),
    })

    const missing = Object.keys(REQUIRED_CC_POINTS).filter(
      (point) => !pointsCovered?.includes(point),
    )
    const missingLabels = missing.map((point) => REQUIRED_CC_POINTS[point]).join(', ')
    items.push({
      key: 'ccPoints',
      label: 'All required points in the CC',
      ...(missing.length
        ? fail(`Missing: ${missingLabels}`, {
            recheck: {
              category: 'missedPointsInCc',
              notes: `The CC mail did not cover: ${missingLabels}.`,
            },
          })
        : pass(`All ${Object.keys(REQUIRED_CC_POINTS).length} required points covered`)),
    })
  }

  if (isEmiPaymentType(lead.paymentType)) {
    const zohoHasEmi = emiRows.some((row) => row.status !== 'info' && row.values.zoho)
    const differing = disagreeing(emiRows, 'zoho', 'vendor')
    let emiCheck
    if (!sources.vendor) {
      emiCheck = fail('No EMI vendor record found', {
        recheck: { category: 'emi', notes: 'No EMI vendor record was found for this lead.' },
      })
    } else if (!zohoHasEmi) {
      emiCheck = fail('Zoho has no EMI terms to compare', {
        recheck: { category: 'emi', notes: 'EMI terms are missing from the Zoho record.' },
      })
    } else if (differing.length) {
      emiCheck = fail(`Vendor differs on ${labelList(differing)}`, {
        recheck: recheckForRows(differing, sourceList),
      })
    } else {
      emiCheck = pass('Loan terms in Zoho match the vendor record')
    }
    items.push({ key: 'emiVendor', label: 'EMI terms match the vendor', ...emiCheck })
  }

  items.push({
    key: 'openRechecks',
    label: 'No open rechecks',
    ...(openRechecks.length
      ? fail(
          `${openRechecks.length} open: ${openRechecks
            .map((recheck) => RECHECK_CATEGORIES[recheck.category]?.label ?? recheck.category)
            .join(', ')}`,
          { link: { label: 'View rechecks', to: `${paths.rechecks()}?status=open` } },
        )
      : pass('Nothing waiting on the BDA')),
  })

  return items
}

export const checklistPasses = (items) => items.every((item) => item.status !== 'fail')
