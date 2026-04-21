import { useEffect } from 'react'

const DEFAULT_TITLE = 'PushupPros — challenge a friend'

export type UseGuideSeoParams = {
  title: string
  description: string
  /** Third breadcrumb item name in JSON-LD (no `item` URL on last item). */
  breadcrumbCurrentName: string
  /** Unique script element id for JSON-LD (avoid collisions across guide pages). */
  jsonLdScriptId: string
}

export function useGuideSeo({
  title,
  description,
  breadcrumbCurrentName,
  jsonLdScriptId,
}: UseGuideSeoParams) {
  useEffect(() => {
    document.title = title
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description

    let script = document.getElementById(jsonLdScriptId) as HTMLScriptElement | null
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Resources',
          item: `${window.location.origin}/guides`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Guides',
          item: `${window.location.origin}/guides`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: breadcrumbCurrentName,
        },
      ],
    }
    if (!script) {
      script = document.createElement('script')
      script.id = jsonLdScriptId
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(jsonLd)

    return () => {
      document.getElementById(jsonLdScriptId)?.remove()
      document.title = DEFAULT_TITLE
    }
  }, [title, description, breadcrumbCurrentName, jsonLdScriptId])
}
