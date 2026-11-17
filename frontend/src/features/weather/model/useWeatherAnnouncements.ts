import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { WeatherCardState } from './presentation'
import type { ManualRefreshOutcome } from './useWeather'

export interface WeatherAnnouncementOptions {
  state: WeatherCardState
  isManualRefreshing: boolean
  manualRefreshOutcome: ManualRefreshOutcome | null
  locale: string
}

function stateSignature(state: WeatherCardState): string {
  if (state.status === 'ready') {
    return `ready:${state.freshness.isOutdated ? 'outdated' : 'current'}:${state.coverage}`
  }
  if (state.status === 'unavailable') {
    return `unavailable:${state.coverage ? 'coverage' : 'failure'}`
  }
  return state.status
}

function formatTime(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date)
  } catch {
    return date.toISOString().slice(11, 16)
  }
}

export function useWeatherAnnouncements(
  options: WeatherAnnouncementOptions,
): string | null {
  const { state, isManualRefreshing, manualRefreshOutcome, locale } = options
  const { t } = useTranslation('home')
  const [message, setMessage] = useState<string | null>(null)
  const signatureRef = useRef<string | null>(null)

  const messageForState = (next: WeatherCardState): string => {
    switch (next.status) {
      case 'no-location':
        return t('weather.announce.noLocation')
      case 'loading':
        return t('weather.loading')
      case 'invalid-location':
        return t('weather.announce.invalidLocation')
      case 'unavailable':
        return next.coverage
          ? t('weather.announce.coverageUnavailable')
          : t('weather.announce.unavailable')
      case 'ready':
        return next.freshness.isOutdated
          ? t('weather.announce.outdated', {
              time: formatTime(next.freshness.lastRetrievedAt, locale),
            })
          : t('weather.announce.updated')
    }
  }

  useEffect(() => {
    const signature = stateSignature(state)
    if (signatureRef.current === signature) return
    signatureRef.current = signature
    setMessage(messageForState(state))
    // messageForState depends on t and locale, both stable for a state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, locale, t])

  useEffect(() => {
    if (isManualRefreshing) {
      // A single polite live region must change only on the manual transition;
      // this is external synchronization that cannot be derived during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(t('weather.announce.refreshing'))
    }
  }, [isManualRefreshing, t])

  useEffect(() => {
    if (manualRefreshOutcome === 'success') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(t('weather.announce.updated'))
    } else if (manualRefreshOutcome === 'failure') {
      setMessage(t('weather.announce.refreshFailed'))
    }
  }, [manualRefreshOutcome, t])

  return message
}
