import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/foundation', labelKey: 'nav.foundation', end: false },
  { to: '/tasks', labelKey: 'nav.tasks', end: false },
  { to: '/settings', labelKey: 'nav.settings', end: false },
  { to: '/commitments', labelKey: 'nav.commitments', end: false },
] as const

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  const base =
    'inline-flex min-h-11 min-w-11 items-center rounded-control px-3 text-caption font-medium'
  return isActive
    ? `${base} bg-surface-subtle text-primary underline underline-offset-4`
    : `${base} text-text-muted hover:bg-surface-subtle hover:text-text`
}

export function Navigation() {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('nav.ariaLabel')}
      className="flex flex-wrap items-center gap-1"
    >
      <NavLink
        to="/"
        end
        className="mr-2 inline-flex min-h-11 items-center rounded-control px-2 font-semibold text-text"
      >
        {t('app.name')}
      </NavLink>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={navLinkClasses}
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}
