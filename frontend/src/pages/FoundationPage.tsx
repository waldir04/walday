import { useTranslation } from 'react-i18next'
import { Link } from '@/shared/ui/Link'

export function FoundationPage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1 tabIndex={-1} className="text-title font-semibold text-text">
        {t('foundation.heading')}
      </h1>
      <p className="mt-2 text-body text-text-muted">
        {t('foundation.description')}
      </p>
      <p className="mt-4">
        <Link to="/">{t('nav.home')}</Link>
      </p>
    </section>
  )
}
