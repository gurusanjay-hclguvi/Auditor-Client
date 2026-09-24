const BASE = '/sales-audit'

export const ROUTE_PATTERNS = {
  myLeads: `${BASE}/my-leads`,
  leads: `${BASE}/leads`,
  leadAudit: `${BASE}/leads/:studentId/audit`,
  rechecks: `${BASE}/rechecks`,
  bda: `${BASE}/bda`,
  overview: `${BASE}/overview`,
  student: `${BASE}/students/:studentId`,
  studentPayments: `${BASE}/students/:studentId/payments`,
  ccVerification: `${BASE}/students/:studentId/cc-verification`,
}

const studentBase = (studentId) => `${BASE}/students/${encodeURIComponent(studentId)}`

export const paths = {
  myLeads: (tab) => (tab ? `${ROUTE_PATTERNS.myLeads}?tab=${tab}` : ROUTE_PATTERNS.myLeads),
  leads: (tab) => (tab ? `${ROUTE_PATTERNS.leads}?tab=${tab}` : ROUTE_PATTERNS.leads),
  rechecks: (tab) => (tab ? `${ROUTE_PATTERNS.rechecks}?tab=${tab}` : ROUTE_PATTERNS.rechecks),
  bda: ROUTE_PATTERNS.bda,
  overview: ROUTE_PATTERNS.overview,
  leadAudit: (studentId) => `${BASE}/leads/${encodeURIComponent(studentId)}/audit`,
  student: studentBase,
  studentPayments: (studentId, category = 'all') =>
    `${studentBase(studentId)}/payments?category=${category}`,
  ccVerification: (studentId) => `${studentBase(studentId)}/cc-verification`,
}
