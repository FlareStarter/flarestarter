import { useEffect, useState } from 'react'

/** True when the viewport is below the md breakpoint (768px). SSR-safe (false on server). */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isMobile
}
