import { getContactName } from './contacts'
import { isSapOverdue, needsEscalation } from './leadStatus'
import { RECHECK_CATEGORIES, getCcStatus } from './recheckStatus'
import { getBdaOptions, isCcActionNeeded, isOwnedBy } from './bdaMetrics'

// Historical views for the Audit Overview and BDA pages: trend vs the previous period, response
// times against a target, and repeat patterns that point at a concrete follow-up.
// history: { rechecks, payments, alerts } with Unix-second timestamps; leads: the Leads response.
export const RESPONSE_TARGET_HOURS = 24
const HOUR_S = 60 * 60
const TARGET_S = RESPONSE_TARGET_HOURS * HOUR_S

export function getPeriods(nowMs, days) {
  const end = Math.floor(nowMs / 1000)
  const span = days * 24 * HOUR_S
  return {
    days,
    now: end,
    current: [end - span, end],
    previous: [end - 2 * span, end - span],
  }
}

const inWindow = (at, [start, end]) => at != null && at > start && at <= end

// Restricts history to the given leads (e.g. one BDA's).
export function scopeHistory(history, leads) {
  const ids = new Set(leads.map((lead) => lead.id))
  return {
    rechecks: history.rechecks.filter((recheck) => ids.has(recheck.leadId)),
    payments: history.payments.filter((payment) => ids.has(payment.leadId)),
    alerts: history.alerts.filter((alert) => ids.has(alert.leadId)),
  }
}

function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const openAt = (recheck, at) =>
  recheck.raisedAt <= at && (recheck.resolvedAt == null || recheck.resolvedAt > at)

// ---- Trends -------------------------------------------------------------------------------

const TREND_METRICS = [
  {
    key: 'rechecksRaised',
    label: 'Rechecks raised',
    higherIsBetter: false,
    count: (history, window) =>
      history.rechecks.filter((recheck) => inWindow(recheck.raisedAt, window)).length,
  },
  {
    key: 'rechecksResolved',
    label: 'Rechecks resolved',
    higherIsBetter: true,
    count: (history, window) =>
      history.rechecks.filter((recheck) => inWindow(recheck.resolvedAt, window)).length,
  },
  {
    key: 'openRechecks',
    label: 'Open rechecks',
    higherIsBetter: false,
    count: (history, [, end]) => history.rechecks.filter((recheck) => openAt(recheck, end)).length,
  },
  {
    key: 'escalations',
    label: 'SAP over-24h mails',
    higherIsBetter: false,
    count: (history, window) =>
      history.alerts.filter(
        (alert) => alert.kind === 'escalation' && inWindow(alert.sentAt, window),
      ).length,
  },
  {
    key: 'mismatches',
    label: 'Payment mismatches',
    higherIsBetter: false,
    count: (history, window) =>
      history.payments.filter(
        (payment) => payment.verified === 'Mismatch' && inWindow(payment.addedAt, window),
      ).length,
  },
]

// Each trend: { key, label, current, previous, delta, verdict: 'better' | 'worse' | 'same' }.
export function computeTrends(history, periods) {
  return Object.fromEntries(
    TREND_METRICS.map(({ key, label, higherIsBetter, count }) => {
      const current = count(history, periods.current)
      const previous = count(history, periods.previous)
      const delta = current - previous
      const improved = higherIsBetter ? delta > 0 : delta < 0
      const verdict = delta === 0 ? 'same' : improved ? 'better' : 'worse'
      return [key, { key, label, current, previous, delta, verdict }]
    }),
  )
}

// ---- Response times -----------------------------------------------------------------------

function summarizeDurations(durations) {
  return {
    count: durations.length,
    medianS: median(durations),
    withinTarget: durations.length
      ? durations.filter((duration) => duration <= TARGET_S).length / durations.length
      : null,
  }
}

const RESPONSE_METRICS = [
  {
    key: 'recheckResolution',
    label: 'Recheck resolution',
    from: 'raised',
    done: (history, _, window) =>
      history.rechecks
        .filter((recheck) => inWindow(recheck.resolvedAt, window))
        .map((recheck) => recheck.resolvedAt - recheck.raisedAt),
    open: (history, leadsById, now) =>
      history.rechecks
        .filter((recheck) => recheck.status === 'open' && leadsById[recheck.leadId])
        .map((recheck) => ({
          id: recheck.id,
          lead: leadsById[recheck.leadId],
          label: `${RECHECK_CATEGORIES[recheck.category]?.label ?? recheck.category} recheck`,
          ageS: now - recheck.raisedAt,
        })),
  },
  {
    key: 'paymentVerification',
    label: 'Payment verification',
    from: 'received',
    done: (history, _, window) =>
      history.payments
        .filter((payment) => inWindow(payment.verifiedAt, window) && payment.addedAt)
        .map((payment) => payment.verifiedAt - payment.addedAt),
    open: (history, leadsById, now) =>
      history.payments
        .filter(
          (payment) =>
            (payment.verified === '' || payment.verified === 'Mismatch') &&
            payment.addedAt &&
            leadsById[payment.leadId],
        )
        .map((payment) => ({
          id: payment.id,
          lead: leadsById[payment.leadId],
          label: `${payment.type.replaceAll('_', ' ')}${
            payment.verified === 'Mismatch' ? ' (mismatch)' : ''
          }`,
          ageS: now - payment.addedAt,
        })),
  },
  {
    key: 'ccUpload',
    label: 'CC upload',
    from: 'entering SAP',
    done: (_, leads, window) =>
      leads
        .filter((lead) => inWindow(lead.ccUploadedAt, window) && lead.sapEnteredAt)
        .map((lead) => lead.ccUploadedAt - lead.sapEnteredAt),
    open: (_, leadsById, now) =>
      Object.values(leadsById)
        .filter((lead) => getCcStatus(lead) === 'pending' && lead.sapEnteredAt)
        .map((lead) => ({
          id: `cc-${lead.id}`,
          lead,
          label: 'CC not uploaded',
          ageS: now - lead.sapEnteredAt,
        })),
  },
]

// Per metric: current / previous duration summaries plus the slowest still-open items.
export function computeResponseTimes(history, leads, periods, { slowestLimit = 5 } = {}) {
  const leadsById = Object.fromEntries(leads.map((lead) => [lead.id, lead]))
  return RESPONSE_METRICS.map(({ key, label, from, done, open }) => {
    const source = key === 'ccUpload' ? leads : leadsById
    return {
      key,
      label,
      from,
      current: summarizeDurations(done(history, source, periods.current)),
      previous: summarizeDurations(done(history, source, periods.previous)),
      slowestOpen: open(history, leadsById, periods.now)
        .sort((a, b) => b.ageS - a.ageS)
        .slice(0, slowestLimit),
    }
  })
}

// ---- Repeat patterns ----------------------------------------------------------------------

const CATEGORY_SUGGESTIONS = {
  payment: 'Review how payment amounts and splits are explained in the CC with the BDA and BDM.',
  emi: 'Check the EMI terms (loan amount, monthly EMI, ROI) being quoted to learners.',
  ccPending: 'Make sure the BDA uploads the confirmation call within 24h of the sale.',
  missedPointsInCc: 'Share the CC checklist again: the same points keep getting missed.',
  approval: 'Confirm approvals are recorded before discounts or terms are offered.',
  downPayment: 'Make sure down-payment proof is attached at booking.',
}

const groupBy = (items, getKey) =>
  items.reduce((groups, item) => {
    const key = getKey(item)
    return key ? { ...groups, [key]: [...(groups[key] ?? []), item] } : groups
  }, {})

const uniqueNames = (records, leadsById) => [
  ...new Set(records.map((record) => leadsById[record.leadId].studentFullName)),
]

// Findings: { id, kind, bda, leadId?, category?, count, title, evidence, suggestion }.
export function findRepeatPatterns(history, leads, periods) {
  const leadsById = Object.fromEntries(leads.map((lead) => [lead.id, lead]))
  const bdas = getBdaOptions(leads)
  const bdaOf = (leadId) => bdas.find((bda) => isOwnedBy(leadsById[leadId] ?? {}, bda.email))
  const windowLabel = `in the last ${periods.days} days`
  const recent = history.rechecks.filter(
    (recheck) => inWindow(recheck.raisedAt, periods.current) && leadsById[recheck.leadId],
  )
  const findings = []

  bdas.forEach((bda) => {
    const own = recent.filter((recheck) => isOwnedBy(leadsById[recheck.leadId], bda.email))
    const bdmName = getContactName(
      leads.find((lead) => isOwnedBy(lead, bda.email))?.saleOwnerManager,
    )

    Object.entries(groupBy(own, (recheck) => recheck.category)).forEach(([category, items]) => {
      if (items.length < 2) return
      const leadNames = uniqueNames(items, leadsById)
      const label = RECHECK_CATEGORIES[category].label
      findings.push({
        id: `category-${bda.email}-${category}`,
        kind: 'category',
        bda,
        bdmName,
        category,
        count: items.length,
        title: `${items.length} ${label} rechecks on ${bda.name}'s leads ${windowLabel}`,
        evidence: leadNames.join(', '),
        suggestion: CATEGORY_SUGGESTIONS[category],
      })
    })

    const resolvedDurations = history.rechecks
      .filter(
        (recheck) =>
          inWindow(recheck.resolvedAt, periods.current) &&
          isOwnedBy(leadsById[recheck.leadId] ?? {}, bda.email),
      )
      .map((recheck) => recheck.resolvedAt - recheck.raisedAt)
    const medianS = median(resolvedDurations)
    if (resolvedDurations.length >= 2 && medianS > TARGET_S) {
      findings.push({
        id: `slow-${bda.email}`,
        kind: 'slowResolution',
        bda,
        bdmName,
        count: resolvedDurations.length,
        medianS,
        title: `${bda.name} takes ${Math.round(medianS / HOUR_S)}h (median) to clear rechecks, over the ${
          RESPONSE_TARGET_HOURS
        }h target`,
        evidence: `${resolvedDurations.length} rechecks resolved ${windowLabel}`,
        suggestion: `Follow up with ${bda.name} and BDM ${
          bdmName || 'their manager'
        } on turnaround.`,
      })
    }

    const mismatches = history.payments.filter(
      (payment) =>
        payment.verified === 'Mismatch' &&
        inWindow(payment.addedAt, periods.current) &&
        isOwnedBy(leadsById[payment.leadId] ?? {}, bda.email),
    )
    if (mismatches.length >= 2) {
      findings.push({
        id: `mismatch-${bda.email}`,
        kind: 'mismatch',
        bda,
        bdmName,
        count: mismatches.length,
        title: `${mismatches.length} payment mismatches on ${bda.name}'s leads ${windowLabel}`,
        evidence: uniqueNames(mismatches, leadsById).join(', '),
        suggestion: 'Check the payment modes and amounts the BDA is sharing with learners.',
      })
    }
  })

  Object.entries(groupBy(recent, (recheck) => recheck.leadId)).forEach(([leadId, items]) => {
    if (items.length < 2) return
    const lead = leadsById[leadId]
    const categories = [
      ...new Set(items.map((item) => RECHECK_CATEGORIES[item.category]?.label ?? item.category)),
    ]
    findings.push({
      id: `lead-${leadId}`,
      kind: 'lead',
      bda: bdaOf(leadId),
      bdmName: getContactName(lead.saleOwnerManager),
      leadId,
      count: items.length,
      title: `${lead.studentFullName} has ${items.length} rechecks ${windowLabel}`,
      evidence: categories.join(', '),
      suggestion: 'Review the whole lead in one pass instead of fixing issues one at a time.',
    })
  })

  return findings.sort((a, b) => b.count - a.count)
}

// ---- Per-BDA summary ----------------------------------------------------------------------

export function summarizeByBda(history, leads, periods) {
  const nowMs = periods.now * 1000
  return getBdaOptions(leads)
    .map((bda) => {
      const own = leads.filter((lead) => isOwnedBy(lead, bda.email))
      const scoped = scopeHistory(history, own)
      const openNow = scoped.rechecks.filter((recheck) => openAt(recheck, periods.now)).length
      const openBefore = scoped.rechecks.filter((recheck) => openAt(recheck, periods.previous[1]))
        .length
      const resolved = scoped.rechecks
        .filter((recheck) => inWindow(recheck.resolvedAt, periods.current))
        .map((recheck) => recheck.resolvedAt - recheck.raisedAt)
      const overduePayments = own.filter(
        (lead) => needsEscalation(lead) && isSapOverdue(lead, nowMs),
      ).length
      const ccToUpdate = own.filter(isCcActionNeeded).length
      return {
        id: bda.email,
        bda,
        bdmName: getContactName(own[0]?.saleOwnerManager),
        leadCount: own.length,
        openRechecks: openNow,
        openRechecksDelta: openNow - openBefore,
        overduePayments,
        ccToUpdate,
        medianResolutionS: median(resolved),
        openIssues: openNow + overduePayments + ccToUpdate,
      }
    })
    .sort((a, b) => b.openIssues - a.openIssues)
}
