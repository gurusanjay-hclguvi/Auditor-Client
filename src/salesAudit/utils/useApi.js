import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

// Runs `fetcher(token)` and tracks its result. Pass a stable fetcher (module function or
// useCallback) so the request only re-runs when its inputs change. A result only counts for the
// token it was fetched with, so switching users never shows the previous user's data.
export function useApi(fetcher) {
  const token = useSelector((state) => state.reducers.commonData.authToken)
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let active = true
    fetcher(token).then(
      (data) => active && setResult({ fetcher, token, reloadKey, data, error: null }),
      (error) =>
        active &&
        setResult({
          fetcher,
          token,
          reloadKey,
          data: null,
          error: error.message || 'Something went wrong',
        }),
    )
    return () => {
      active = false
    }
  }, [fetcher, token, reloadKey])

  const settled =
    result?.fetcher === fetcher && result?.token === token && result?.reloadKey === reloadKey

  return {
    data: settled ? result.data : null,
    error: settled ? result.error : null,
    loading: !settled,
    reload: () => setReloadKey((key) => key + 1),
  }
}
