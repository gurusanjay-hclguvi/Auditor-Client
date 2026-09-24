import { MOCK_STUDENTS } from './students'

// Mock users for GET /me, built from the (anonymized) mock leads: every auditor
// (auditCoordinator), every BDM (saleOwnerManager) and every BDA (saleOwner).
//
// A mock token names its user: "dev-mock-token:<email>" (the dev shell's Mock user picker sets
// it). Zen's real tokens are opaque; the backend resolves them from `auth`.
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

export const mockTokenFor = (email) => `${MOCK_TOKEN_PREFIX}${email}`

export function findMockUserByToken(token) {
  if (!token?.startsWith(MOCK_TOKEN_PREFIX)) return null
  const email = token.slice(MOCK_TOKEN_PREFIX.length).trim().toLowerCase()
  return MOCK_USERS.find((user) => user.email === email) ?? null
}
