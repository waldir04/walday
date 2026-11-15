import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Container } from '@/shared/ui/Container'
import { WaldayLogo } from '@/shared/ui/WaldayLogo'
import { RouteAnnouncer } from '@/app/RouteAnnouncer'
import { Navigation } from './Navigation'

export function AppShell() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-text">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:text-text focus:shadow-card"
      >
        {t('a11y.skipToContent')}
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-canvas/80 backdrop-blur-md">
        <Container className="flex items-center justify-between gap-3 py-2">
          <NavLink
            to="/"
            className="inline-flex min-h-11 items-center rounded-control px-1"
            aria-label={t('app.name')}
          >
            <WaldayLogo />
          </NavLink>
          <Navigation />
        </Container>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 bg-canvas py-page sm:py-page-wide"
      >
        <Container>
          <Outlet />
        </Container>
      </main>
      <RouteAnnouncer />
    </div>
  )
}
