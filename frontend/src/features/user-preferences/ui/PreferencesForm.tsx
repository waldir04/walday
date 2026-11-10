import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserPreferences } from '../../../entities/preferences/model/types'
import {
  DATE_TIME_PRESENTATIONS,
  SUPPORTED_LANGUAGES,
  WEATHER_UNITS,
  type DateTimePresentation,
  type SupportedLanguage,
  type WeatherUnit,
} from '../../../shared/config/preferences'

interface Props {
  preferences: UserPreferences
  onSave: (_preferences: UserPreferences) => void
}

export function PreferencesForm({ preferences: initialPreferences, onSave }: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<UserPreferences>(initialPreferences)
  const [feedback, setFeedback] = useState('')

  function updateDraft(next: UserPreferences) {
    setDraft(next)
    setFeedback('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(draft)
    setFeedback(t('preferences.saveFeedback'))
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 max-w-xl space-y-4" aria-label={t('preferences.heading')}>
      <div>
        <label htmlFor="pref-language" className="block text-sm font-medium">
          {t('preferences.language')}
        </label>
        <select
          id="pref-language"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          value={draft.language}
          onChange={(e) =>
            updateDraft({ ...draft, language: e.target.value as SupportedLanguage })
          }
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {t(`preferences.options.language.${lang}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="pref-datetime" className="block text-sm font-medium">
          {t('preferences.dateTimePresentation')}
        </label>
        <select
          id="pref-datetime"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          value={draft.dateTimePresentation}
          onChange={(e) =>
            updateDraft({
              ...draft,
              dateTimePresentation: e.target.value as DateTimePresentation,
            })
          }
        >
          {DATE_TIME_PRESENTATIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`preferences.options.dateTimePresentation.${opt}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="pref-units" className="block text-sm font-medium">
          {t('preferences.weatherUnits')}
        </label>
        <select
          id="pref-units"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          value={draft.weatherUnits}
          onChange={(e) => updateDraft({ ...draft, weatherUnits: e.target.value as WeatherUnit })}
        >
          {WEATHER_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {t(`preferences.options.weatherUnits.${unit}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="pref-location" className="block text-sm font-medium">
          {t('preferences.weatherLocation')}
        </label>
        <input
          id="pref-location"
          type="text"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          placeholder={t('preferences.weatherLocationPlaceholder')}
          value={draft.weatherLocation?.name ?? ''}
          onChange={(e) => {
            const name = e.target.value
            updateDraft({
              ...draft,
              weatherLocation: name.trim() ? { name } : null,
            })
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          {t('preferences.heading')}
        </button>
        {feedback ? (
          <p role="status" aria-live="polite" className="text-sm text-green-700">
            {feedback}
          </p>
        ) : null}
      </div>
    </form>
  )
}