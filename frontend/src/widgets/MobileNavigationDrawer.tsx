import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useDialogFocusTrap } from '@/shared/lib/useDialogFocusTrap'
import { NAV_ITEMS } from './navigationItems'

export interface MobileNavigationDrawerProps {
  open: boolean
  onClose: () => void
}

const DESKTOP_QUERY = '(min-width: 768px)'

function itemClasses({ isActive }: { isActive: boolean }): string {
  const base =
    'flex min-h-11 items-center rounded-2xl p-4 text-body font-medium'
  return isActive
    ? `${base} bg-surface text-primary underline underline-offset-4`
    : `${base} text-text-muted hover:bg-surface hover:text-primary`
}

export function MobileNavigationDrawer({
  open,
  onClose,
}: MobileNavigationDrawerProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const lastPathRef = useRef(location.pathname)

  const { handleKeyDown, handleCancel } = useDialogFocusTrap({
    open,
    dialogRef,
    initialFocusRef: closeRef,
    onClose,
    lockScroll: true,
  })

  useEffect(() => {
    if (!open) return
    if (lastPathRef.current !== location.pathname) {
      lastPathRef.current = location.pathname
      onClose()
    }
  }, [open, location.pathname, onClose])

  useEffect(() => {
    if (!open) return
    if (typeof window.matchMedia !== 'function') return

    const query = window.matchMedia(DESKTOP_QUERY)
    if (query.matches) {
      onClose()
      return
    }

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) onClose()
    }
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [open, onClose])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      id="mobile-navigation-drawer"
      aria-modal="true"
      aria-labelledby="mobile-navigation-title"
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      className="drawer-panel fixed inset-x-0 top-0 m-0 w-full max-w-none rounded-b-2xl border-b border-border bg-canvas/95 p-4 text-text shadow-card backdrop-blur-lg backdrop:bg-canvas/80"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="mobile-navigation-title"
          className="text-caption font-semibold uppercase tracking-wide text-text-muted"
        >
          {t('nav.drawerTitle')}
        </h2>
        <Button
          buttonRef={closeRef}
          variant="ghost"
          aria-label={t('nav.closeMenu')}
          onClick={onClose}
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </Button>
      </div>
      <ul className="mt-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={itemClasses}
              onClick={onClose}
            >
              {t(item.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </dialog>
  )
}
