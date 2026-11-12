import { useTranslation } from 'react-i18next'
import {
  DATE_TIME_PRESENTATIONS,
  type DateTimePresentation,
} from '@/entities/preferences'

export interface DateTimeFieldProps {
  value: DateTimePresentation
  disabled?: boolean
  onChange: (_value: DateTimePresentation) => void
}

export function DateTimeField({
  value,
  onChange,
  disabled = false,
}: DateTimeFieldProps) {
  const { t } = useTranslation('preferences')

  return (
    <fieldset className="space-y-2">
      <legend className="text-body font-medium text-text">
        {t('dateTime.legend')}
      </legend>
      <p id="pref-datetime-help" className="text-caption text-text-muted">
        {t('dateTime.help')}
      </p>
      <div className="space-y-2">
        {DATE_TIME_PRESENTATIONS.map((option) => (
          <div key={option} className="flex items-center gap-3">
            <input
              id={`pref-datetime-${option}`}
              type="radio"
              name="pref-datetime"
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              disabled={disabled}
              aria-describedby="pref-datetime-help"
              className="h-6 w-6 border-border text-primary"
            />
            <label
              htmlFor={`pref-datetime-${option}`}
              className="text-body text-text"
            >
              {t(`dateTime.options.${option}`)}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  )
}
