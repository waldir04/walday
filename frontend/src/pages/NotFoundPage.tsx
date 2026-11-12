import { useTranslation } from 'react-i18next'
import { Link } from '@/shared/ui/Link'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1 tabIndex={-1} className="text-title font-semibold text-text">
        {t('notFound.heading')}
      </h1>
      <p className="mt-2 text-body text-text-muted">
        {t('notFound.description')}
      </p>
      <p className="mt-4">
        <Link to="/">{t('notFound.home')}</Link>
      </p>
    </section>
  )
}
