import { useTranslation } from 'react-i18next'

export function AgendaIncompleteNotice() {
  const { t } = useTranslation('agenda')

  return (
    <section
      aria-labelledby="agenda-incomplete-heading"
      className="space-y-2 rounded-2xl border border-warning bg-surface p-5"
    >
      <h2
        id="agenda-incomplete-heading"
        className="text-body font-semibold text-warning"
      >
        {t('incomplete.heading')}
      </h2>
      <p className="text-caption text-text-muted">
        {t('incomplete.description')}
      </p>
    </section>
  )
}
