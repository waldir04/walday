import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from 'lucide-react'
import type { Conditions } from '@/entities/weather'

export const CONDITION_ICONS: Record<Conditions, typeof Sun> = {
  clear: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
  fog: CloudFog,
  unknown: Cloud,
}

export function conditionBadgeTone(condition: Conditions): string {
  switch (condition) {
    case 'clear':
    case 'partly-cloudy':
      return 'border-warm/50 text-warm'
    case 'rain':
    case 'snow':
    case 'storm':
    case 'fog':
      return 'border-cool/50 text-cool'
    default:
      return 'border-border-strong text-text-muted'
  }
}
