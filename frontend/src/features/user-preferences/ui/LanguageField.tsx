import { useTranslation } from 'react-i18next'
import type { SupportedLanguage } from '@/entities/preferences'

export interface LanguageFieldProps {
  value: SupportedLanguage | null
  effectiveLanguage: SupportedLanguage
  disabled?: boolean
  onChange: (_value: SupportedLanguage | null) => void
}

export function LanguageField({
  value,
  effectiveLanguage,
  onChange,
  disabled = false,
}: LanguageFieldProps) {
  const { t } = useTranslation('preferences')
  const sourceText =
    value === null
      ? t('language.source.browser', {
          language: t(`language.options.${effectiveLanguage}`),
        })
      : t('language.source.explicit')

  const options: Array<{
    value: SupportedLanguage | null
    id: string
    label: string
  }> = [
    {
      value: null,
      id: 'pref-language-browser',
      label: t('language.options.browser'),
    },
    { value: 'en', id: 'pref-language-en', label: t('language.options.en') },
    { value: 'es', id: 'pref-language-es', label: t('language.options.es') },
  ]

  return (
    <fieldset className="space-y-2 rounded-2xl border border-border bg-surface p-5">
      <legend className="text-body font-medium text-text">
        {t('language.legend')}
      </legend>
      <p id="pref-language-help" className="text-caption text-text-muted">
        {sourceText}
      </p>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-3">
            <input
              id={option.id}
              type="radio"
              name="pref-language"
              value={option.value ?? 'browser'}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              aria-describedby="pref-language-help"
              className="h-6 w-6 border-border-strong text-primary"
            />
            <label htmlFor={option.id} className="text-body text-text">
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  )
}
