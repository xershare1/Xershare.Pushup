import { useEffect, useState } from 'react'

/** Object URL for a File/Blob; revoked on change/unmount. */
export function useBlobUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => {
      URL.revokeObjectURL(u)
    }
  }, [blob])

  return url
}
