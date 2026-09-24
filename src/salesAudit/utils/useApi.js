import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

// Runs `fetcher(token)` and tracks its result. Pass a stable fetcher (module function or
// useCallback) so the request only re-runs when its inputs change.
export function useApi(fetcher) {
  const token = useSelector((state) => state.reducers.commonData.authToken)
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let active = true
    fetcher(token).then(
      (data) => active && setResult({ fetcher, reloadKey, data, error: null }),
      (error) =>
        active &&
        setResult({ fetcher, reloadKey, data: null, error: error.message || 'Something went wrong' }),
    )
    return () => {
      active = false
    }
  }, [fetcher, token, reloadKey])

  const settled = result?.fetcher === fetcher && result?.reloadKey === reloadKey

  return {
    data: settled ? result.data : null,
    error: settled ? result.error : null,
    loading: !settled,
    reload: () => setReloadKey((key) => key + 1),
  }
}
