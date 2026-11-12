import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Container } from '@/shared/ui/Container'
import { RouteAnnouncer } from '@/app/RouteAnnouncer'
import { Navigation } from './Navigation'

export function AppShell() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col bg-surface text-text">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:inline-flex focus:min-h-11 focus:items-center focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:text-text focus:shadow-card"
      >
        {t('a11y.skipToContent')}
      </a>
      <header className="border-b border-border">
        <Container className="py-2">
          <Navigation />
        </Container>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 py-page sm:py-page-wide"
      >
        <Container>
          <Outlet />
        </Container>
      </main>
      <RouteAnnouncer />
    </div>
  )
}
