import { createSlice } from '@reduxjs/toolkit'

// Dev-shell stand-in for Zen's commonData slice; Zen provides the real token, user and
// permissions. The signed-in user is kept for the browser tab so a reload doesn't log out.
const SESSION_KEY = 'salesAuditDevUser'

const SIGNED_OUT = {
  authToken: null,
  user: null,
  permission: {},
}

function signedIn(user) {
  return {
    authToken: `dev-mock-token-${user.role}`,
    user,
    permission: { salesAudit: { read: true, write: true } },
  }
}

function loadSession() {
  try {
    const user = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    return user?.email && user?.role ? signedIn(user) : SIGNED_OUT
  } catch {
    return SIGNED_OUT
  }
}

function saveSession(user) {
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage blocked: the login just lasts until reload.
  }
}

const commonDataSlice = createSlice({
  name: 'commonData',
  initialState: loadSession,
  reducers: {
    loggedIn: (_state, action) => signedIn(action.payload),
    loggedOut: () => SIGNED_OUT,
  },
})

export function logIn(user) {
  saveSession(user)
  return commonDataSlice.actions.loggedIn(user)
}

export function logOut() {
  saveSession(null)
  return commonDataSlice.actions.loggedOut()
}

export default commonDataSlice.reducer
