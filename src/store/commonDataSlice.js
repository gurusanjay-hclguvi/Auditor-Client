import { createSlice } from '@reduxjs/toolkit'

// Dev-shell stand-in for Zen's commonData slice (the starter kit's stub): Zen provides the real
// token and permissions. The dev token names a mock user ("dev-mock-token:<email>", see
// src/salesAudit/apiCalls/mocks/users.js); the app bar's Mock user picker swaps it.
const commonDataSlice = createSlice({
  name: 'commonData',
  initialState: {
    authToken: 'dev-mock-token:auditor1@example.com',
    permission: {
      salesAudit: { read: true, write: true },
    },
  },
  reducers: {
    // Dev only: act as another mock user. Zen sets the token itself.
    setAuthToken: (state, action) => {
      state.authToken = action.payload
    },
  },
})

export const { setAuthToken } = commonDataSlice.actions

export default commonDataSlice.reducer
