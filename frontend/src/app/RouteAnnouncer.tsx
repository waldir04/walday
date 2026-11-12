import { useEffect, useRef, useState } from 'react'
import { useLocation, useMatches } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { RouteHandle } from './router'

function isRouteHandle(value: unknown): value is RouteHandle {
  return (
    typeof value === 'object' &&
    value !== null &&
    'titleKey' in value &&
    typeof (value as { titleKey?: unknown }).titleKey === 'string'
  )
}

export function RouteAnnouncer() {
  const location = useLocation()
  const matches = useMatches()
  const { t } = useTranslation()
  const [announcement, setAnnouncement] = useState('')
  const isFirstRender = useRef(true)

  const handle = [...matches]
    .reverse()
    .map((match) => match.handle)
    .find(isRouteHandle)

  const title = handle
    ? t(handle.titleKey, { ns: handle.titleNamespace ?? 'common' })
    : t('app.title')

  useEffect(() => {
    document.title = title

    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const main = document.getElementById('main-content')
    const heading = main?.querySelector('h1')
    if (heading instanceof HTMLElement) {
      heading.focus()
    } else if (main instanceof HTMLElement) {
      main.focus()
    }
    setAnnouncement(t('a11y.routeChanged', { page: title }))
  }, [location.pathname, title, t])

  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </p>
  )
}
