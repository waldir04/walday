import { useTranslation } from 'react-i18next'

export function HomePage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1 tabIndex={-1} className="text-display font-bold text-text">
        {t('app.name')}
      </h1>
      <p className="mt-2 text-body text-text-muted">
        {t('foundation.description')}
      </p>
    </section>
  )
}
