import { MOCK_STUDENTS } from './students'

// Mock users for GET /me, built from the (anonymized) mock leads: every auditor
// (auditCoordinator), every BDM (saleOwnerManager) and every BDA (saleOwner).
//
// A dev token names its user: "dev-mock-token:<role>:<email>" (the dev shell's Mock user picker
// sets it). The backend's mock auth accepts any token; until it serves /sales-audit/me, the
// frontend reads the user from this token. Zen's real tokens are opaque.
export const MOCK_TOKEN_PREFIX = 'dev-mock-token:'

const byNumber = (a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0])
const distinct = (field) =>
  [...new Set(MOCK_STUDENTS.map((lead) => lead[field]).filter(Boolean))].sort(byNumber)

const toUser = (role, label) => (email) => ({
  hash: `mock-${email.split('@')[0]}`,
  name: `${label} ${email.match(/\d+/)?.[0] ?? email}`,
  email,
  role,
})

export const MOCK_USERS = [
  ...distinct('auditCoordinator').map(toUser('auditor', 'Auditor')),
  ...distinct('saleOwnerManager').map(toUser('bdm', 'Sales Manager')),
  ...distinct('saleOwner').map(toUser('bda', 'Sales Owner')),
]

export const mockTokenFor = (user) => `${MOCK_TOKEN_PREFIX}${user.role}:${user.email}`

const ROLE_NAMES = { auditor: 'Auditor', bdm: 'Sales Manager', bda: 'Sales Owner' }

// "dev-mock-token:<role>:<email>" -> { hash, name, email, role }, or null.
export function userFromDevToken(token) {
  if (!token?.startsWith(MOCK_TOKEN_PREFIX)) return null
  const [role, ...rest] = token.slice(MOCK_TOKEN_PREFIX.length).split(':')
  const email = rest.join(':').trim().toLowerCase()
  if (!ROLE_NAMES[role] || !email) return null
  return { hash: `dev-${email.split('@')[0]}`, name: email, email, role }
}

export function findMockUserByToken(token) {
  const user = userFromDevToken(token)
  if (!user) return null
  return MOCK_USERS.find((candidate) => candidate.email === user.email && candidate.role === user.role) ?? null
}

// Dev accounts from real leads (the backend's): every BDM and BDA on them, every audit
// coordinator, and the mock auditors so the auditor pages can always be opened.
export function devUsersFromLeads(leads) {
  const emails = (field) => [...new Set(leads.map((lead) => lead[field]).filter(Boolean))].sort()
  const auditors = [...new Set([...emails('auditCoordinator'), 'auditor1@example.com'])]
  return [
    ...auditors.map((email) => ({ hash: `dev-${email}`, name: email, email, role: 'auditor' })),
    ...emails('saleOwnerManager').map((email) => ({ hash: `dev-${email}`, name: email, email, role: 'bdm' })),
    ...emails('saleOwner').map((email) => ({ hash: `dev-${email}`, name: email, email, role: 'bda' })),
  ]
}
