// Turns a Zoho lead export (real data) into the anonymized mock fixture the app runs on:
//   node scripts/anonymizeZohoSample.mjs random.json src/salesAudit/apiCalls/mocks/zohoLeads.json
//
// Kept: the structure, payment types, statuses, amounts, dates, verification, reminders, EMI
// vendor / status / terms, products, languages, modes. Replaced: every name, email, phone, id,
// payment reference and link. Dropped: admissionDetails, campaign fields. Never commit the input
// file: it holds real personal data (it is in .gitignore).
import { readFileSync, writeFileSync } from 'node:fs'

const [input = 'random.json', output = 'src/salesAudit/apiCalls/mocks/zohoLeads.json'] =
  process.argv.slice(2)

const FIRST = ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Sana', 'Ishaan', 'Nila', 'Varun', 'Tara',
  'Arjun', 'Charu', 'Vikram', 'Anika', 'Dev', 'Ira', 'Karan', 'Maya', 'Nikhil', 'Riya']
const LAST = ['Test', 'Sample', 'Demo', 'Placeholder', 'Mock', 'Example', 'Fixture', 'Stub', 'Dummy']

// Links that point at real CC files become the app's own sample PDF (CCs are treated as PDFs).
const DRIVE_TEST_LINK =
  'https://drive.google.com/file/d/1eaQ9XX4g-_Gj-ARHIq0YVuFWwTKRS9M0/view?usp=sharing'
function fakeSourceLink(link) {
  if (!link) return ''
  if (/drive\.google\.com|docs\.google\.com/.test(link)) return DRIVE_TEST_LINK
  if (/^https?:\/\/[^\s]+$/.test(link)) return '/mock-cc.pdf'
  return 'http://cc copy (1).pdf' // Zoho sometimes stores a bare file name; kept as a bad link
}

// Stable fake ids for people who appear on many leads (BDAs, BDMs, application creators).
function aliasMaker(prefix, domain) {
  const aliases = new Map()
  return (value) => {
    if (!value) return value ?? null
    const key = String(value).trim().toLowerCase()
    if (!aliases.has(key)) aliases.set(key, `${prefix}${aliases.size + 1}`)
    return domain ? `${aliases.get(key)}@${domain}` : aliases.get(key)
  }
}

const raw = JSON.parse(readFileSync(input, 'utf8'))
const records = (Array.isArray(raw) ? raw : raw.result).filter((lead) => lead.superleapId)

// Number BDAs and BDMs by how many leads they have, so owner1 / manager1 are the busiest.
const byCount = (field) => {
  const counts = new Map()
  records.forEach((lead) => {
    const key = (lead[field] ?? '').trim().toLowerCase()
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key)
}
const ownerAlias = aliasMaker('owner', 'example.com')
const managerAlias = aliasMaker('manager', 'example.com')
byCount('saleOwner').forEach(ownerAlias)
byCount('saleOwnerManager').forEach(managerAlias)
const creatorAlias = aliasMaker('salesops', '')
const auditorAlias = aliasMaker('auditor', 'example.com')
const onboardAlias = aliasMaker('onboard', 'example.com')
const approverAlias = aliasMaker('approver', 'example.com')

let refCounter = 0
const ref = (prefix, width = 10) => `${prefix}${String((refCounter += 1)).padStart(width, '0')}`

const leads = records.map((lead, index) => {
  const number = index + 1
  const first = FIRST[index % FIRST.length]
  const last = LAST[Math.floor(index / FIRST.length) % LAST.length]
  const name = `${first} ${last}`
  const learnerName = String(lead.name ?? '').trim().toLowerCase()
  return {
    superleapId: `stu-${1000 + number}`,
    name,
    email: `${first}.${last}${number}@example.com`.toLowerCase(),
    phone: `+9100000${String(number).padStart(5, '0')}`,
    product: lead.product ?? null,
    courseFee: lead.courseFee ?? null,
    paymenttype: lead.paymenttype ?? null,
    ...(lead.partialCategory !== undefined && { partialCategory: lead.partialCategory }),
    totalPaid: lead.totalPaid ?? null,
    balaceAmount: lead.balaceAmount ?? null,
    status: lead.status ?? null,
    saleOwner: ownerAlias(lead.saleOwner),
    saleOwnerManager: managerAlias(lead.saleOwnerManager),
    ...(lead.auditCoordinator !== undefined && { auditCoordinator: auditorAlias(lead.auditCoordinator) }),
    ...(lead.onboardCoordinator !== undefined && {
      onboardCoordinator: onboardAlias(lead.onboardCoordinator),
    }),
    ...(lead.zenId !== undefined && { zenId: lead.zenId ? String(76000 + number) : lead.zenId }),
    ...(lead.CourseDiscountDetails !== undefined && {
      CourseDiscountDetails: lead.CourseDiscountDetails.map((request) => ({
        requestedCourseFee: request.requestedCourseFee,
        requestedperson: approverAlias(request.requestedperson),
        actualCourseFee: request.actualCourseFee,
        course: request.course,
        discountValue: request.discountValue,
        paymentType: request.paymentType,
        status: request.status,
      })),
    }),
    // Audit comments are kept: they describe the recheck, not the learner. Check a new export
    // before committing in case a comment names someone.
    ...(lead.recheckDetails !== undefined && {
      recheckDetails: lead.recheckDetails.map((recheck) => ({
        auditComments: recheck.auditComments,
        newccLink: recheck.newccLink ? '/mock-cc.pdf' : '',
        requestPerson: auditorAlias(recheck.requestPerson),
        ticketStatus: recheck.ticketStatus,
        recheckattempt: recheck.recheckattempt,
        recheckDate: recheck.recheckDate,
        SRID: recheck.SRID,
        pendingList: recheck.pendingList,
      })),
    }),
    salesTeam: lead.salesTeam ?? null,
    source: lead.source ?? null,
    medium: '',
    content: '',
    campaign: '',
    affiliateId: '',
    modeOfStudy: lead.modeOfStudy ?? null,
    preferredLanguage: lead.preferredLanguage ?? null,
    dateOfEnrollment: lead.dateOfEnrollment ?? null,
    crmLeadCreatedDate: lead.crmLeadCreatedDate ?? null,
    willLeadPayinSameMonth: lead.willLeadPayinSameMonth ?? null,
    zbCustomerId: ref('79000000', 10),
    zbInvoiceId: ref('79100000', 10),
    confirmationCall: fakeSourceLink(lead.confirmationCall),
    admissionDetails: {},
    financialDetails: (lead.financialDetails ?? []).map((record) => ({
      recordId: ref('9000000', 11),
      utrPaymentId: record.type === 'Discount' ? `CN-${String(refCounter).padStart(5, '0')}` : ref('pay_mock', 8),
      amount: record.amount,
      zbReceiptCreated: record.zbReceiptCreated,
      ...(record.zbModeOfPayment !== undefined && { zbModeOfPayment: record.zbModeOfPayment }),
      zbReceiptpaymentID: ref('7908', 14),
      verified: record.verified,
      paymentDate: record.paymentDate,
      verifiedDate: record.verifiedDate ?? null,
      type: record.type,
    })),
    partialReminders: (lead.partialReminders ?? []).map((reminder) => {
      const id = ref('9100000', 11)
      return {
        linkCreatedDateTime: reminder.linkCreatedDateTime,
        linkStatus: reminder.linkStatus,
        recordId: id,
        noOfPartial: reminder.noOfPartial,
        amount: reminder.amount,
        paymentLinkId: `plink_mock${id.slice(-6)}`,
        dueDate: reminder.dueDate,
        paymentUrl: `https://example.com/pay/${id}`,
        partialStaus: reminder.partialStaus,
        ...(reminder.paymentPaidId !== undefined && {
          paymentPaidId: reminder.paymentPaidId ? `pay_mockpaid${id.slice(-6)}` : null,
        }),
        ...(reminder.paidDateTime !== undefined && { paidDateTime: reminder.paidDateTime }),
        ...(reminder.partialpaymentStatus !== undefined && {
          partialpaymentStatus: reminder.partialpaymentStatus,
        }),
      }
    }),
    subscriptionReminders: [],
    EMIdetails: (lead.EMIdetails ?? []).map((emi) => {
      const inLearnerName = String(emi.applicationInTheNameOf ?? '').trim().toLowerCase() === learnerName
      const creator = creatorAlias(emi.applicationCreatorEmail ?? emi.applicationCreatorName)
      return {
        recordId: ref('9200000', 11),
        emiVendor: emi.emiVendor,
        emiStatus: emi.emiStatus,
        stage: emi.stage,
        applicationId: ref('LP', 8),
        applicationDate: emi.applicationDate,
        applicationCreatorName: creator ? `Sales Ops ${creator.replace('salesops', '')}` : null,
        applicationCreatorEmail: creator ? `${creator}@example.com` : null,
        applicationInTheNameOf: inLearnerName ? name : `Parent of ${first}`,
        ...(emi.coApplicantName !== undefined && {
          coApplicantName: emi.coApplicantName ? `Co Applicant ${number}` : emi.coApplicantName,
        }),
        ...(emi.coApplicantEmail !== undefined && {
          coApplicantEmail: emi.coApplicantEmail ? `coapplicant${number}@example.com` : emi.coApplicantEmail,
        }),
        tenorInMonth: emi.tenorInMonth ?? null,
        ROIinPercentage: emi.ROIinPercentage ?? null,
        loanAmount: emi.loanAmount ?? null,
        ...(emi.firstEMIamount !== undefined && { firstEMIamount: emi.firstEMIamount }),
        ...(emi.disbursalAmount !== undefined && { disbursalAmount: emi.disbursalAmount }),
        ...(emi.batchCode !== undefined && { batchCode: emi.batchCode }),
        ...(emi.droppedCategory !== undefined && { droppedCategory: emi.droppedCategory }),
      }
    }),
  }
})

writeFileSync(output, `${JSON.stringify(leads, null, 2)}\n`)
console.log(`Wrote ${leads.length} anonymized leads to ${output}`)
