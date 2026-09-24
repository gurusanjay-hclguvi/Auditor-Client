import { combineReducers, configureStore } from '@reduxjs/toolkit'
import commonData from './commonDataSlice'

const store = configureStore({
  reducer: {
    reducers: combineReducers({ commonData }),
  },
})

export default store
