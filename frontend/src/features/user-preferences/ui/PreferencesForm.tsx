import { useEffect, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router-dom'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Button } from '@/shared/ui/Button'
import { usePreferencesController } from '../model/PreferencesRoot'
import { LanguageField } from './LanguageField'
import { DateTimeField } from './DateTimeField'
import { WeatherUnitsField } from './WeatherUnitsField'
import { WeatherLocationField } from './WeatherLocationField'
import { DiscardDraftDialog } from './DiscardDraftDialog'

function noticeColor(kind: string): string {
  switch (kind) {
    case 'success':
      return 'text-success'
    case 'session-only':
      return 'text-warning'
    case 'conflict':
    case 'error':
      return 'text-danger'
    default:
      return 'text-text-muted'
  }
}

export function PreferencesForm() {
  const { t } = useTranslation('preferences')
  const controller = usePreferencesController()
  const {
    draft,
    errors,
    pending,
    dirty,
    notice,
    replacePromptOpen,
    setLanguage,
    setDateTimePresentation,
    setWeatherUnits,
    requestSave,
    cancelDraft,
    confirmReplace,
    cancelReplace,
    reportDialogActive,
  } = controller

  const blocker = useBlocker(dirty)
  const discardOpen = blocker.state === 'blocked'

  useEffect(() => {
    if (errors.locationQuery) {
      document.getElementById('pref-location-query')?.focus()
    } else if (errors.weatherLocation) {
      document.getElementById('pref-location-query')?.focus()
    }
  }, [errors.locationQuery, errors.weatherLocation])

  useEffect(() => {
    reportDialogActive(blocker.state === 'blocked')
  }, [blocker.state, reportDialogActive])

  useEffect(() => {
    if (!dirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [dirty])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void requestSave()
  }

  const errorEntries = [
    errors.locationQuery
      ? { field: 'locationQuery', message: t(errors.locationQuery) }
      : null,
    errors.weatherLocation
      ? { field: 'weatherLocation', message: t(errors.weatherLocation) }
      : null,
  ].filter(
    (entry): entry is { field: string; message: string } => entry !== null,
  )

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label={t('form.label')}
        className="mt-4 max-w-xl space-y-section"
      >
        {errorEntries.length > 0 ? (
          <div
            role="alert"
            tabIndex={-1}
            className="rounded-2xl border border-danger bg-surface-raised p-5"
          >
            <h2 className="text-body font-semibold text-danger">
              {t('validation.summaryHeading')}
            </h2>
            <ul className="mt-1 list-disc pl-5 text-body text-text">
              {errorEntries.map((entry) => (
                <li key={entry.field}>{entry.message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <LanguageField
          value={draft.language}
          effectiveLanguage={controller.effectiveLanguage}
          onChange={setLanguage}
          disabled={pending}
        />
        <DateTimeField
          value={draft.dateTimePresentation}
          onChange={setDateTimePresentation}
          disabled={pending}
        />
        <WeatherUnitsField
          value={draft.weatherUnits}
          onChange={setWeatherUnits}
          disabled={pending}
        />
        <WeatherLocationField />

        <div className="flex flex-wrap items-center gap-3">
          {dirty ? (
            <p className="text-caption font-medium text-warning">
              {t('draft.unsaved')}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? t('actions.saving') : t('actions.save')}
          </Button>
          <Button
            variant="secondary"
            disabled={pending || !dirty}
            onClick={cancelDraft}
          >
            {t('actions.cancel')}
          </Button>
        </div>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="min-h-6 text-body"
        >
          {notice ? (
            <p className={noticeColor(notice.kind)}>{t(notice.messageKey)}</p>
          ) : null}
        </div>
      </form>

      <DiscardDraftDialog
        open={discardOpen}
        onStay={() => {
          reportDialogActive(false)
          if (blocker.state === 'blocked') blocker.reset()
        }}
        onDiscard={() => {
          reportDialogActive(false)
          cancelDraft()
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />

      <ConfirmDialog
        open={replacePromptOpen}
        heading={t('dialogs.replace.heading')}
        description={t('dialogs.replace.description')}
        confirmLabel={t('dialogs.replace.confirm')}
        cancelLabel={t('dialogs.replace.cancel')}
        danger
        onConfirm={() => {
          void confirmReplace()
        }}
        onCancel={cancelReplace}
      />
    </>
  )
}
