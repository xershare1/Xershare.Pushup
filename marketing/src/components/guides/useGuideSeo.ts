import { useEffect } from 'react'

const DEFAULT_TITLE = 'PushupPros — challenge a friend'

const DEFAULT_MIDDLE = { name: 'Guides' as const, itemPath: '/guides' as const }

const EMPTY_ADDITIONAL_JSON_LD: { id: string; data: unknown }[] = []

export type UseGuideSeoParams = {
  title: string
  description: string
  /** Third breadcrumb item name in JSON-LD (no `item` URL on last item). */
  breadcrumbCurrentName: string
  /** Unique script element id for JSON-LD (avoid collisions across guide pages). */
  jsonLdScriptId: string
  /** Second BreadcrumbList item (default: Guides @ /guides). */
  middleSegment?: { name: string; itemPath: string }
  /** Optional Article JSON-LD (e.g. long-form learn pages). */
  articleJsonLd?: {
    scriptId: string
    pagePath: string
    datePublished: string
    /** Main headline; typically matches document title. */
    headline: string
  }
  /** Additional JSON-LD (e.g. ItemList of records). Each id must be unique. */
  additionalJsonLd?: { id: string; data: unknown }[]
}

export function useGuideSeo({
  title,
  description,
  breadcrumbCurrentName,
  jsonLdScriptId,
  middleSegment = DEFAULT_MIDDLE,
  articleJsonLd,
  additionalJsonLd = EMPTY_ADDITIONAL_JSON_LD,
}: UseGuideSeoParams) {
  const mid = middleSegment
  const art = articleJsonLd
  const moreLd = additionalJsonLd

  useEffect(() => {
    document.title = title
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description

    const origin = window.location.origin
    const middleItemUrl = `${origin}${mid.itemPath}`

    let script = document.getElementById(jsonLdScriptId) as HTMLScriptElement | null
    const jsonLdBreadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Resources',
          item: `${origin}/guides`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: mid.name,
          item: middleItemUrl,
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
    script.textContent = JSON.stringify(jsonLdBreadcrumb)

    let articleScript: HTMLScriptElement | null = null
    if (art) {
      const pageUrl = `${origin}${art.pagePath}`
      articleScript = document.getElementById(art.scriptId) as HTMLScriptElement | null
      const jsonLdArticle = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: art.headline,
        datePublished: art.datePublished,
        author: {
          '@type': 'Organization',
          name: 'PushupPros',
        },
        publisher: {
          '@type': 'Organization',
          name: 'PushupPros',
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': pageUrl,
        },
      }
      if (!articleScript) {
        articleScript = document.createElement('script')
        articleScript.id = art.scriptId
        articleScript.type = 'application/ld+json'
        document.head.appendChild(articleScript)
      }
      articleScript.textContent = JSON.stringify(jsonLdArticle)
    }

    for (const block of moreLd) {
      let s = document.getElementById(block.id) as HTMLScriptElement | null
      if (!s) {
        s = document.createElement('script')
        s.id = block.id
        s.type = 'application/ld+json'
        document.head.appendChild(s)
      }
      s.textContent = JSON.stringify(block.data)
    }

    return () => {
      document.getElementById(jsonLdScriptId)?.remove()
      if (art) document.getElementById(art.scriptId)?.remove()
      for (const block of moreLd) {
        document.getElementById(block.id)?.remove()
      }
      document.title = DEFAULT_TITLE
    }
  }, [title, description, breadcrumbCurrentName, jsonLdScriptId, mid.name, mid.itemPath, art, moreLd])
}
