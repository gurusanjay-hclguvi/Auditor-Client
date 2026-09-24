import { createSlice } from '@reduxjs/toolkit'

// Dev-shell stand-in for Zen's commonData slice; Zen provides the real token and permissions.
const commonDataSlice = createSlice({
  name: 'commonData',
  initialState: {
    authToken: 'dev-mock-token',
    permission: {
      salesAudit: { read: true, write: false },
    },
  },
  reducers: {},
})

export default commonDataSlice.reducer
