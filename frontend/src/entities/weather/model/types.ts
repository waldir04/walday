export const CONDITIONS = [
  'clear',
  'partly-cloudy',
  'cloudy',
  'rain',
  'snow',
  'storm',
  'fog',
  'unknown',
] as const

export type Conditions = (typeof CONDITIONS)[number]

export interface CurrentConditions {
  temperatureCelsius: number | null
  apparentTemperatureCelsius: number | null
  relativeHumidityPercent: number | null
  windSpeedKilometersPerHour: number | null
  precipitationMillimeters: number | null
  condition: Conditions
}

export interface HourlyEntry {
  time: number
  temperatureCelsius: number | null
  condition: Conditions
  precipitationProbability: number | null
}

export interface WeatherSnapshot {
  units: 'metric'
  retrievedAt: string
  observedAt: string | null
  current: CurrentConditions | null
  hourly: HourlyEntry[]
}

export interface StoredWeatherSnapshot {
  version: 1
  providerPlaceId: string
  localDate: string
  fetchedAt: string
  snapshot: WeatherSnapshot
}
