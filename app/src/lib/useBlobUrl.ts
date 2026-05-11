import { useEffect, useMemo } from 'react'

/** Object URL for a File/Blob; revoked on change/unmount. */
export function useBlobUrl(blob: Blob | null): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])

  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [url])

  return url
}
