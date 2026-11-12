import { useTranslation } from 'react-i18next'
import { usePreferencesController } from '../model/PreferencesRoot'
import { composeLocationLabel } from '../model/locationResolver'
import { Button } from '@/shared/ui/Button'

function errorKey(code: string): string {
  switch (code) {
    case 'LOCATION_TIMEOUT':
      return 'location.errors.timeout'
    case 'LOCATION_RATE_LIMITED':
      return 'location.errors.rateLimited'
    case 'LOCATION_QUERY_INVALID':
      return 'validation.locationQueryInvalid'
    default:
      return 'location.errors.unavailable'
  }
}

export function WeatherLocationField() {
  const { t } = useTranslation('preferences')
  const controller = usePreferencesController()
  const {
    draft,
    errors,
    locationStatus,
    formattingLocale,
    pending,
    setLocationQuery,
    searchLocations,
    selectLocation,
    clearLocation,
  } = controller

  const searching = locationStatus.status === 'loading'
  const queryInvalid = Boolean(errors.locationQuery)

  return (
    <fieldset className="space-y-3">
      <legend className="text-body font-medium text-text">
        {t('location.legend')}
      </legend>
      <p className="text-caption text-text-muted">{t('location.help')}</p>

      {draft.weatherLocation ? (
        <div className="rounded-control border border-border bg-surface-subtle p-3">
          <p className="break-words text-body text-text">
            {t('location.selected', { label: draft.weatherLocation.label })}
          </p>
          <div className="mt-2">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={clearLocation}
            >
              {t('location.clear')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-body text-text-muted">{t('location.none')}</p>
      )}

      <div>
        <label
          htmlFor="pref-location-query"
          className="block text-body font-medium text-text"
        >
          {t('location.queryLabel')}
        </label>
        <div className="mt-1 flex flex-wrap items-end gap-2">
          <input
            id="pref-location-query"
            type="text"
            value={draft.locationQuery}
            disabled={pending}
            aria-invalid={queryInvalid}
            aria-describedby={
              queryInvalid
                ? 'pref-location-query-help pref-location-query-error'
                : 'pref-location-query-help'
            }
            onChange={(event) => setLocationQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void searchLocations()
              }
            }}
            className="min-h-11 w-full max-w-sm rounded-control border border-border bg-surface px-3 py-2 text-body text-text"
          />
          <Button
            variant="secondary"
            disabled={pending || searching}
            aria-busy={searching}
            onClick={() => {
              void searchLocations()
            }}
          >
            {searching ? t('location.searching') : t('location.search')}
          </Button>
        </div>
        <p
          id="pref-location-query-help"
          className="mt-1 text-caption text-text-muted"
        >
          {t('location.queryHelp')}
        </p>
        {queryInvalid ? (
          <p
            id="pref-location-query-error"
            className="mt-1 text-caption font-medium text-danger"
          >
            {t(errors.locationQuery ?? 'validation.locationQueryInvalid')}
          </p>
        ) : null}
        {errors.weatherLocation ? (
          <p className="mt-1 text-caption font-medium text-danger">
            {t(errors.weatherLocation)}
          </p>
        ) : null}
      </div>

      <div aria-live="polite" aria-atomic="true" className="min-h-6">
        {locationStatus.status === 'empty' ? (
          <p className="text-body text-text-muted">{t('location.empty')}</p>
        ) : null}
        {locationStatus.status === 'error' ? (
          <div className="space-y-2">
            <p className="text-body text-danger">
              {t(errorKey(locationStatus.code))}
            </p>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                void searchLocations()
              }}
            >
              {t('location.retry')}
            </Button>
          </div>
        ) : null}
      </div>

      {locationStatus.status === 'idle' &&
      locationStatus.candidates.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-body font-medium text-text">
            {t('location.candidatesLegend')}
          </legend>
          <div className="space-y-2">
            {locationStatus.candidates.map((candidate, index) => {
              const id = `pref-location-option-${index}`
              const label = composeLocationLabel(candidate, formattingLocale)
              return (
                <div
                  key={candidate.providerPlaceId}
                  className="flex items-start gap-3"
                >
                  <input
                    id={id}
                    type="radio"
                    name="pref-location-candidate"
                    checked={
                      draft.weatherLocation?.providerPlaceId ===
                      candidate.providerPlaceId
                    }
                    onChange={() => selectLocation(candidate)}
                    className="mt-1 h-6 w-6 border-border text-primary"
                  />
                  <label
                    htmlFor={id}
                    className="break-words text-body text-text"
                  >
                    {label}
                  </label>
                </div>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      <p className="text-caption text-text-muted">
        {t('location.attribution')}
      </p>
    </fieldset>
  )
}
