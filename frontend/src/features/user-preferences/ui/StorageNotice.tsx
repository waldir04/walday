import { useTranslation } from 'react-i18next'
import { usePreferencesController } from '../model/PreferencesRoot'
import { Button } from '@/shared/ui/Button'

export function StorageNotice() {
  const { t } = useTranslation('preferences')
  const controller = usePreferencesController()
  const { persistence, pending } = controller

  if (persistence.mode === 'normal') return null

  if (persistence.mode === 'session-only') {
    const mayRetry = persistence.reason !== 'cleared'
    return (
      <section
        aria-live="polite"
        className="rounded-card border border-warning bg-surface p-section"
      >
        <h2 className="text-title font-semibold text-warning">
          {t('storage.sessionOnlyHeading')}
        </h2>
        <p className="mt-2 text-body text-text">
          {t(`storage.sessionOnly.${persistence.reason}`)}
        </p>
        {mayRetry ? (
          <div className="mt-3">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                void controller.retryPersistence()
              }}
            >
              {t('storage.retry')}
            </Button>
          </div>
        ) : null}
      </section>
    )
  }

  if (persistence.mode === 'conflict') {
    return (
      <section
        aria-live="polite"
        className="rounded-card border border-danger bg-surface p-section"
      >
        <h2 className="text-title font-semibold text-danger">
          {t('storage.conflictHeading')}
        </h2>
        <p className="mt-2 text-body text-text">
          {t('storage.conflictDescription')}
        </p>
        <div className="mt-3">
          <Button
            variant="secondary"
            onClick={() => {
              window.location.reload()
            }}
          >
            {t('storage.reload')}
          </Button>
        </div>
      </section>
    )
  }

  if (persistence.mode === 'recovery-blocked') {
    return (
      <section
        aria-live="polite"
        className="rounded-card border border-warning bg-surface p-section"
      >
        <h2 className="text-title font-semibold text-warning">
          {t('storage.partialHeading')}
        </h2>
        <p className="mt-2 text-body text-text">
          {t('storage.partialDescription')}
        </p>
        {persistence.fields.length > 0 ? (
          <ul className="mt-2 list-disc pl-5 text-body text-text">
            {persistence.fields.map((field) => (
              <li key={field}>{t(`fields.${field}`)}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={controller.requestReplace}
          >
            {t('storage.replaceAction')}
          </Button>
        </div>
      </section>
    )
  }

  if (persistence.mode === 'protected') {
    const heading =
      persistence.reason === 'corrupt'
        ? t('storage.corruptHeading')
        : t('storage.migrationFailedHeading')
    return (
      <section
        aria-live="polite"
        className="rounded-card border border-danger bg-surface p-section"
      >
        <h2 className="text-title font-semibold text-danger">{heading}</h2>
        <p className="mt-2 text-body text-text">
          {t('storage.protectedDescription')}
        </p>
        <div className="mt-3">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={controller.requestReplace}
          >
            {t('storage.replaceAction')}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-live="polite"
      className="rounded-card border border-warning bg-surface p-section"
    >
      <h2 className="text-title font-semibold text-warning">
        {t('storage.unsupportedHeading')}
      </h2>
      <p className="mt-2 text-body text-text">
        {t('storage.unsupportedDescription')}
      </p>
      <div className="mt-3">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={controller.requestReplace}
        >
          {t('storage.replaceAction')}
        </Button>
      </div>
    </section>
  )
}
