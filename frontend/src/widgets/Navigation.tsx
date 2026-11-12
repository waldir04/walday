import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Navigation() {
  const { t } = useTranslation()
  return (
    <nav className="border-b border-gray-200 px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <Link to="/" className="font-semibold">
          {t('app.name')}
        </Link>
        <Link to="/tasks" className="text-sm text-gray-600">
          {t('nav.tasks')}
        </Link>
        <Link to="/settings" className="text-sm text-gray-600">
          {t('nav.settings')}
        </Link>
        <Link to="/commitments" className="text-sm text-gray-600">
          {t('nav.commitments')}
        </Link>
      </div>
    </nav>
  )
}
