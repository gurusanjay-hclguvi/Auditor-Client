import { useState } from 'react'
import { useToken } from './roles'

// Runs a write call (`action(token, ...args)`) and tracks its busy / error state. Resolves to the
// call's data, or undefined when it failed (the error is kept for the dialog to show).
export function useAction(action) {
  const token = useToken()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function run(...args) {
    setBusy(true)
    setError(null)
    try {
      return await action(token, ...args)
    } catch (failure) {
      setError(failure.message)
      return undefined
    } finally {
      setBusy(false)
    }
  }

  return { run, busy, error, clearError: () => setError(null) }
}
