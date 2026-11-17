export const WEATHER_CONDITIONS = [
  'clear',
  'partly-cloudy',
  'cloudy',
  'rain',
  'snow',
  'storm',
  'fog',
  'unknown',
] as const

export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number]

export interface CurrentConditions {
  temperatureCelsius: number | null
  apparentTemperatureCelsius: number | null
  relativeHumidityPercent: number | null
  windSpeedKilometersPerHour: number | null
  precipitationMillimeters: number | null
  condition: WeatherCondition
}

export interface HourlyForecastEntry {
  time: number
  temperatureCelsius: number | null
  condition: WeatherCondition
  precipitationProbability: number | null
}

export interface WeatherSnapshot {
  units: 'metric'
  retrievedAt: string
  observedAt: string | null
  current: CurrentConditions | null
  hourly: HourlyForecastEntry[]
}

export interface LocationCandidate {
  providerPlaceId: string
  name: string
  region: string
  countryCode: string
  latitude: number
  longitude: number
}
