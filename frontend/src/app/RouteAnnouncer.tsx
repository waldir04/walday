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
  const { t, i18n } = useTranslation()
  const [announcement, setAnnouncement] = useState('')
  const previousPath = useRef(location.pathname)
  const previousLanguage = useRef(i18n.language)

  const handle = [...matches]
    .reverse()
    .map((match) => match.handle)
    .find(isRouteHandle)

  const title = handle
    ? t(handle.titleKey, { ns: handle.titleNamespace ?? 'common' })
    : t('app.title')

  useEffect(() => {
    document.title = title

    if (previousLanguage.current !== i18n.language) {
      previousLanguage.current = i18n.language
      setAnnouncement(
        t('a11y.languageChanged', {
          language: t(`languageNames.${i18n.language}`),
        }),
      )
      return
    }

    // A language change re-renders the translation function and updates the
    // document title, but it is not a navigation. Moving focus or announcing a
    // route change here would be an unexpected focus movement.
    if (previousPath.current === location.pathname) return
    previousPath.current = location.pathname

    const main = document.getElementById('main-content')
    const heading = main?.querySelector('h1')
    if (heading instanceof HTMLElement) {
      heading.focus()
    } else if (main instanceof HTMLElement) {
      main.focus()
    }
    setAnnouncement(t('a11y.routeChanged', { page: title }))
  }, [location.pathname, title, t, i18n.language])

  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </p>
  )
}
