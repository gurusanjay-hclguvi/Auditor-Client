import { ROLES } from './salesAudit/utils/roles'
import { MOCK_STUDENTS } from './salesAudit/apiCalls/mocks/students'

// Dev-shell demo accounts, built from the (anonymized) mock leads: every auditor
// (auditCoordinator), every BDM (saleOwnerManager) and every BDA (saleOwner). Zen's own login
// replaces them; any non-empty password is accepted.
const byNumber = (a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0])
const distinct = (field) =>
  [...new Set(MOCK_STUDENTS.map((lead) => lead[field]).filter(Boolean))].sort(byNumber)

const displayName = (email, label) => `${label} ${email.match(/\d+/)?.[0] ?? email}`

const MOCK_USERS = [
  ...distinct('auditCoordinator').map((email) => ({
    name: displayName(email, 'Auditor'),
    email,
    role: ROLES.auditor,
  })),
  ...distinct('saleOwnerManager').map((email) => ({
    name: displayName(email, 'Sales Manager'),
    email,
    role: ROLES.bdm,
  })),
  ...distinct('saleOwner').map((email) => ({
    name: displayName(email, 'Sales Owner'),
    email,
    role: ROLES.bda,
  })),
]

export function findMockUser(email) {
  const normalized = email.trim().toLowerCase()
  return MOCK_USERS.find((user) => user.email === normalized) ?? null
}

export default MOCK_USERS
