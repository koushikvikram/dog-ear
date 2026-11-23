import { useEffect, useState } from 'react'

// The design system has two platforms and no responsive CSS, so the app picks one at runtime.
const QUERY = '(max-width: 767px)'
const read = () => (typeof window !== 'undefined' && window.matchMedia(QUERY).matches ? 'mobile' : 'desktop')

export function usePlatform() {
  const [p, setP] = useState(read)
  useEffect(() => {
    const m = window.matchMedia(QUERY)
    const f = () => setP(m.matches ? 'mobile' : 'desktop')
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return p
}
