import { createSlice } from '@reduxjs/toolkit'

// Dev-shell stand-in for Zen's commonData slice (the starter kit's stub): Zen provides the real
// token and permissions. The dev token names a user ("dev-mock-token:<role>:<email>", see
// src/salesAudit/apiCalls/mocks/users.js); the app bar's Mock user picker swaps it. The dev shell
// remembers the picked mock user for the browser tab so a reload keeps it (Zen keeps its own
// session; the feature itself never stores the token).
const DEFAULT_TOKEN = 'dev-mock-token:auditor:auditor1@example.com'
const DEV_TOKEN_KEY = 'salesAuditDevMockToken'

function loadDevToken() {
  try {
    const saved = sessionStorage.getItem(DEV_TOKEN_KEY)
    return saved?.startsWith('dev-mock-token:') ? saved : DEFAULT_TOKEN
  } catch {
    return DEFAULT_TOKEN
  }
}

function saveDevToken(token) {
  try {
    sessionStorage.setItem(DEV_TOKEN_KEY, token)
  } catch {
    // Storage blocked: the picked user lasts until reload.
  }
}

const commonDataSlice = createSlice({
  name: 'commonData',
  initialState: () => ({
    authToken: loadDevToken(),
    permission: {
      salesAudit: { read: true, write: true },
    },
  }),
  reducers: {
    // Dev only: act as another mock user. Zen sets the token itself.
    setAuthToken: (state, action) => {
      state.authToken = action.payload
    },
  },
})

const { setAuthToken: setToken } = commonDataSlice.actions

export function setAuthToken(token) {
  saveDevToken(token)
  return setToken(token)
}

export default commonDataSlice.reducer
