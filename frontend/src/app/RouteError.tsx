import { useEffect, useRef } from 'react'
import { useRouteError } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Link } from '@/shared/ui/Link'

function isChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /dynamically imported module|Loading chunk|Importing a module script failed/i.test(
    error.message,
  )
}

export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const chunkError = isChunkError(error)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const heading = chunkError ? t('error.chunkHeading') : t('error.routeHeading')
  const description = chunkError
    ? t('error.chunkDescription')
    : t('error.routeDescription')

  return (
    <section
      role="alert"
      className="mx-auto min-h-screen max-w-2xl bg-canvas px-page py-section"
    >
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-title font-semibold text-danger"
      >
        {heading}
      </h1>
      <p className="mt-2 text-body text-text">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => window.location.reload()}>
          {t('error.retry')}
        </Button>
        <Link to="/" variant="inline" className="self-center">
          {t('error.home')}
        </Link>
      </div>
    </section>
  )
}
