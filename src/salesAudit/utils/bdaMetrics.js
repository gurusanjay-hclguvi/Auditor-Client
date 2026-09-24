import { getContactEmail, getContactName } from './contacts'
import {
  CREDIT_TYPES,
  getCreditStatus,
  getMsUntilEscalation,
  getSapAgeMs,
  isSapOverdue,
  needsEscalation,
} from './leadStatus'
import { RECHECK_CATEGORIES, getCcStatus } from './recheckStatus'
import { formatCurrency, formatDuration } from './formatters'
import { paths } from './routePaths'

// Action items and alerts for one BDA (a lead's saleOwner), computed from the Leads response
// (with credits, escalation, ccResponse) and the rechecks list.

export function getBdaOptions(leads) {
  const byEmail = new Map()
  leads.forEach((lead) => {
    const email = getContactEmail(lead.saleOwner)
    if (email && !byEmail.has(email)) {
      byEmail.set(email, { email, name: getContactName(lead.saleOwner) })
    }
  })
  return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function isOwnedBy(lead, bdaEmail) {
  return getContactEmail(lead.saleOwner) === bdaEmail
}

// A pending CC still needs the BDA unless they've reported the mail as sent.
export function isCcActionNeeded(lead) {
  return getCcStatus(lead) === 'pending' && lead.ccResponse?.response !== 'mailSentAwaitingAck'
}

export const ACTION_PRIORITIES = {
  1: { label: 'Urgent', color: 'error' },
  2: { label: 'Urgent', color: 'error' },
  3: { label: 'Today', color: 'warning' },
  4: { label: 'Today', color: 'warning' },
  5: { label: 'Follow up', color: 'default' },
}

export const ACTION_TYPES = {
  payment: 'Payments to get verified',
  recheck: 'Open rechecks',
  cc: 'CCs to update',
  balance: 'Balance to follow up',
}

const CREDIT_LABELS = {
  bookingAmount: 'Down payment',
  part1: 'Initial payment',
  remainingBalance: 'Remaining balance',
}

const CREDIT_CATEGORY = {
  bookingAmount: 'downPayment',
  part1: 'partial',
  remainingBalance: 'remainingBalance',
}

function paymentItems(lead, nowMs) {
  if (!needsEscalation(lead)) return []
  const overdue = isSapOverdue(lead, nowMs)
  const age = formatDuration(getSapAgeMs(lead, nowMs))
  return Object.keys(CREDIT_TYPES)
    .filter((key) => ['unverified', 'mismatch'].includes(getCreditStatus(lead.credits?.[key])))
    .map((key) => {
      const credit = lead.credits[key]
      const status = getCreditStatus(credit) === 'mismatch' ? 'mismatch' : 'not verified'
      return {
        id: `payment-${lead.id}-${key}`,
        type: 'payment',
        priority: overdue ? 1 : 4,
        lead,
        ageMs: getSapAgeMs(lead, nowMs),
        title: `${CREDIT_LABELS[key]} ${status}`,
        why: `${formatCurrency(credit.amount)} · ${age} in SAP · ${
          overdue
            ? 'Accounts already mailed'
            : `auto-mail to Accounts in ${formatDuration(getMsUntilEscalation(lead, nowMs))}`
        }`,
        action: {
          label: 'View payments',
          to: paths.studentPayments(lead.id, CREDIT_CATEGORY[key]),
        },
      }
    })
}

function recheckItems(lead, rechecks, nowMs) {
  return rechecks
    .filter((recheck) => recheck.leadId === lead.id && recheck.status === 'open')
    .map((recheck) => {
      const ageMs = Math.max(0, nowMs - recheck.raisedAt * 1000)
      const ccRelated = ['ccPending', 'missedPointsInCc'].includes(recheck.category)
      return {
        id: `recheck-${recheck.id}`,
        type: 'recheck',
        priority: 2,
        lead,
        ageMs,
        title: `${RECHECK_CATEGORIES[recheck.category]?.label ?? recheck.category} recheck`,
        why: `${recheck.notes} · raised ${formatDuration(ageMs)} ago`,
        action: {
          label: ccRelated && lead.confirmationCallLink ? 'Open CC' : 'View lead',
          to:
            ccRelated && lead.confirmationCallLink
              ? paths.ccVerification(lead.id)
              : paths.student(lead.id),
        },
      }
    })
}

function ccItems(lead, nowMs) {
  if (!isCcActionNeeded(lead)) return []
  const ageMs = getSapAgeMs(lead, nowMs)
  return [
    {
      id: `cc-${lead.id}`,
      type: 'cc',
      priority: 3,
      lead,
      ageMs,
      title: 'Confirmation call pending',
      why:
        lead.ccResponse?.response === 'mailNotSent'
          ? `You reported the CC mail as not sent · ${formatDuration(ageMs)} since sale`
          : `No CC uploaded and no update given · ${formatDuration(ageMs)} since sale`,
      action: { label: 'Update CC', updateCc: true },
    },
  ]
}

function balanceItems(lead) {
  const balance = Number(lead.balanceAmount)
  if (!(balance > 0)) return []
  return [
    {
      id: `balance-${lead.id}`,
      type: 'balance',
      priority: 5,
      lead,
      ageMs: 0,
      balance,
      title: 'Balance outstanding',
      why: `${formatCurrency(balance)} left of ${formatCurrency(lead.courseValue)} · ${
        lead.paymentType
      }`,
      action: { label: 'View payments', to: paths.studentPayments(lead.id) },
    },
  ]
}

// Everything this BDA should do next, most urgent first (then oldest first).
export function buildActionItems(leads, rechecks, nowMs) {
  return leads
    .flatMap((lead) => [
      ...paymentItems(lead, nowMs),
      ...recheckItems(lead, rechecks, nowMs),
      ...ccItems(lead, nowMs),
      ...balanceItems(lead),
    ])
    .sort((a, b) => a.priority - b.priority || b.ageMs - a.ageMs)
}

export const ALERT_SOURCES = {
  recheck: { label: 'Auditor recheck', group: 'auditor' },
  escalation: { label: 'SAP over 24h', group: 'automated' },
  ccNotSent: { label: 'CC mail not sent', group: 'automated' },
  recheckReminder: { label: 'Recheck overdue', group: 'automated' },
}

const categoryLabel = (category) => RECHECK_CATEGORIES[category]?.label ?? category

// Every alert mailed to this BDA's leads, newest first. `actionNeeded` stays true until the
// underlying issue is cleared (recheck resolved, payment verified, CC uploaded).
export function buildAlertFeed(leads, rechecks) {
  const leadsById = Object.fromEntries(leads.map((lead) => [lead.id, lead]))

  const recheckAlerts = rechecks
    .filter((recheck) => recheck.alert && leadsById[recheck.leadId])
    .map((recheck) => ({
      id: `recheck-${recheck.id}`,
      source: 'recheck',
      lead: leadsById[recheck.leadId],
      mail: recheck.alert,
      detail: `${categoryLabel(recheck.category)}: ${recheck.notes}`,
      actionNeeded: recheck.status === 'open',
    }))

  const reminderAlerts = rechecks
    .filter((recheck) => recheck.lastReminder && leadsById[recheck.leadId])
    .map((recheck) => ({
      id: `reminder-${recheck.id}`,
      source: 'recheckReminder',
      lead: leadsById[recheck.leadId],
      mail: recheck.lastReminder,
      detail: `${categoryLabel(recheck.category)} recheck still open after 24h: ${recheck.notes}`,
      actionNeeded: recheck.status === 'open',
    }))

  const escalationAlerts = leads
    .filter((lead) => lead.escalation)
    .map((lead) => ({
      id: `escalation-${lead.id}`,
      source: 'escalation',
      lead,
      mail: lead.escalation,
      detail: 'Payment paid but not verified (or mismatched) after 24h in Sales Action Pending.',
      actionNeeded: needsEscalation(lead),
    }))

  const ccAlerts = leads
    .filter((lead) => lead.ccResponse?.alert)
    .map((lead) => ({
      id: `cc-${lead.id}`,
      source: 'ccNotSent',
      lead,
      mail: lead.ccResponse.alert,
      detail: 'CC mail has not been sent to the learner yet.',
      actionNeeded: isCcActionNeeded(lead),
    }))

  return [...recheckAlerts, ...reminderAlerts, ...escalationAlerts, ...ccAlerts].sort(
    (a, b) => b.mail.sentAt - a.mail.sentAt,
  )
}
