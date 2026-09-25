const BASE = '/sales-audit'

export const ROUTE_PATTERNS = {
  myLeads: `${BASE}/my-leads`,
  leads: `${BASE}/leads`,
  lead: `${BASE}/leads/:leadId`,
  leadAudit: `${BASE}/leads/:leadId/audit`,
  ccVerification: `${BASE}/leads/:leadId/cc-verification`,
  rechecks: `${BASE}/rechecks`,
  teamDashboard: `${BASE}/team-dashboard`,
  bdaDashboard: `${BASE}/dashboard`,
  alerts: `${BASE}/alerts`,
  members: `${BASE}/members`,
}

const leadBase = (leadId) => `${BASE}/leads/${encodeURIComponent(leadId)}`

export const paths = {
  myLeads: ROUTE_PATTERNS.myLeads,
  leads: ROUTE_PATTERNS.leads,
  lead: leadBase,
  leadAudit: (leadId) => `${leadBase(leadId)}/audit`,
  ccVerification: (leadId) => `${leadBase(leadId)}/cc-verification`,
  rechecks: (query = '') =>
    query ? `${ROUTE_PATTERNS.rechecks}?${query}` : ROUTE_PATTERNS.rechecks,
  teamDashboard: ROUTE_PATTERNS.teamDashboard,
  bdaDashboard: ROUTE_PATTERNS.bdaDashboard,
  alerts: ROUTE_PATTERNS.alerts,
  members: ROUTE_PATTERNS.members,
}
