import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { MobileNavigationDrawer } from './MobileNavigationDrawer'
import { NAV_ITEMS } from './navigationItems'

function desktopLinkClasses({ isActive }: { isActive: boolean }): string {
  const base =
    'inline-flex min-h-11 min-w-11 items-center rounded-control px-3 text-caption font-medium'
  return isActive
    ? `${base} bg-surface text-primary underline underline-offset-4`
    : `${base} text-text-muted hover:bg-surface hover:text-primary`
}

export function Navigation() {
  const { t } = useTranslation()
  const [openMenu, setOpenMenu] = useState(false)

  function closeMenu() {
    setOpenMenu(false)
  }

  return (
    <nav
      aria-label={t('nav.ariaLabel')}
      className="flex items-center justify-end gap-1"
    >
      <div
        data-desktop-nav
        className="hidden items-center gap-1 md:flex"
        aria-hidden={openMenu || undefined}
        inert={openMenu || undefined}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={desktopLinkClasses}
          >
            {({ isActive }) => (
              <>
                {t(item.labelKey)}
                <span
                  aria-hidden="true"
                  data-active-indicator={isActive ? 'true' : undefined}
                  className={
                    isActive
                      ? 'ml-2 h-0.5 w-4 rounded-full bg-primary'
                      : 'ml-2 h-0.5 w-4 rounded-full bg-primary opacity-0'
                  }
                />
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div data-mobile-nav-trigger className="md:hidden">
        <Button
          variant="ghost"
          aria-expanded={openMenu}
          aria-controls="mobile-navigation-drawer"
          aria-label={openMenu ? t('nav.closeMenu') : t('nav.openMenu')}
          onClick={() => setOpenMenu((current) => !current)}
        >
          {openMenu ? (
            <X aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Menu aria-hidden="true" className="h-5 w-5" />
          )}
        </Button>
      </div>

      <MobileNavigationDrawer open={openMenu} onClose={closeMenu} />
    </nav>
  )
}
