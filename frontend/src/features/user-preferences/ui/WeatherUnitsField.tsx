import { useTranslation } from 'react-i18next'
import { WEATHER_UNITS, type WeatherUnit } from '@/entities/preferences'

export interface WeatherUnitsFieldProps {
  value: WeatherUnit
  disabled?: boolean
  onChange: (_value: WeatherUnit) => void
}

export function WeatherUnitsField({
  value,
  onChange,
  disabled = false,
}: WeatherUnitsFieldProps) {
  const { t } = useTranslation('preferences')

  return (
    <fieldset className="space-y-2">
      <legend className="text-body font-medium text-text">
        {t('units.legend')}
      </legend>
      <p id="pref-units-help" className="text-caption text-text-muted">
        {t('units.help')}
      </p>
      <div className="space-y-2">
        {WEATHER_UNITS.map((unit) => (
          <div key={unit} className="flex items-center gap-3">
            <input
              id={`pref-units-${unit}`}
              type="radio"
              name="pref-units"
              value={unit}
              checked={value === unit}
              onChange={() => onChange(unit)}
              disabled={disabled}
              aria-describedby="pref-units-help"
              className="h-6 w-6 border-border text-primary"
            />
            <label
              htmlFor={`pref-units-${unit}`}
              className="text-body text-text"
            >
              {t(`units.options.${unit}`)}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  )
}
