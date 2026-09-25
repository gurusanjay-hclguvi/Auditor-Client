import { useEffect, useState } from 'react'

const nowSeconds = () => Math.floor(Date.now() / 1000)

// The current time in Unix seconds, refreshed every `intervalMs`, for "… ago" labels that keep
// counting while the page is open.
export function useNow(intervalMs = 60 * 1000) {
  const [now, setNow] = useState(nowSeconds)
  useEffect(() => {
    const timer = setInterval(() => setNow(nowSeconds()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
