import { getContactEmail } from '../../utils/contacts'
import { isSapOverdue, needsEscalation } from '../../utils/leadStatus'

// Stand-in for the backend's Redis worker that sends alert mails (SAP escalations, recheck and
// CC alerts). Nothing is actually sent: mails are kept in memory until page reload.
const ACCOUNTS_EMAIL = 'accounts@example.com'
const REMAIL_AFTER_SECONDS = 24 * 60 * 60

const lastEscalationByLead = new Map()
const escalationLog = []
const reminderLog = []

export function sendMockMail({ to, subject, trigger = 'auto' }, nowMs) {
  return { to: to.filter(Boolean), subject, trigger, sentAt: Math.floor(nowMs / 1000) }
}

function recordEscalation(lead, trigger, nowMs) {
  const mail = sendMockMail(
    {
      to: [getContactEmail(lead.saleOwner), ACCOUNTS_EMAIL],
      subject: `Payment verification pending over 24h: ${lead.studentFullName}`,
      trigger,
    },
    nowMs,
  )
  lastEscalationByLead.set(lead.id, mail)
  escalationLog.push({ ...mail, leadId: lead.id, kind: 'escalation' })
  return mail
}

// Every escalation mail sent since page load, for the history views.
export function getEscalationLog() {
  return escalationLog
}

export function getEscalation(leadId) {
  return lastEscalationByLead.get(leadId) ?? null
}

// Mails every lead that needs escalation, has been in SAP for over 24h and wasn't mailed in the
// last 24h. Returns how many mails were sent.
export function runEscalationSweep(leads, nowMs) {
  const nowSeconds = Math.floor(nowMs / 1000)
  const due = leads.filter((lead) => {
    const lastMail = lastEscalationByLead.get(lead.id)
    return (
      needsEscalation(lead) &&
      isSapOverdue(lead, nowMs) &&
      (!lastMail || nowSeconds - lastMail.sentAt >= REMAIL_AFTER_SECONDS)
    )
  })
  due.forEach((lead) => recordEscalation(lead, 'auto', nowMs))
  return due.length
}

// Re-mails the BDA and BDM about every recheck still open 24h after it was raised (or after the
// last reminder). Stores the latest reminder on the recheck as `lastReminder`.
export function runRecheckReminderSweep(rechecks, leads, nowMs) {
  const nowSeconds = Math.floor(nowMs / 1000)
  rechecks
    .filter(
      (recheck) =>
        recheck.status === 'open' &&
        nowSeconds - (recheck.lastReminder?.sentAt ?? recheck.raisedAt) >= REMAIL_AFTER_SECONDS,
    )
    .forEach((recheck) => {
      const lead = leads.find((candidate) => candidate.id === recheck.leadId)
      if (!lead) return
      const mail = sendMockMail(
        {
          to: [getContactEmail(lead.saleOwner), getContactEmail(lead.saleOwnerManager)],
          subject: `Reminder: recheck still open after 24h: ${lead.studentFullName}`,
        },
        nowMs,
      )
      recheck.lastReminder = mail
      reminderLog.push({ ...mail, leadId: lead.id, kind: 'recheckReminder' })
    })
}

export function getReminderLog() {
  return reminderLog
}

export function sendManualReminder(lead, nowMs) {
  return recordEscalation(lead, 'manual', nowMs)
}
