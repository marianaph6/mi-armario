import { useEffect, useState } from 'react'

/** Convierte un Blob guardado en una URL que se puede mostrar en <img>. */
export function useObjectUrl(blob?: Blob | null) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}
