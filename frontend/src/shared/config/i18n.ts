import { includesValue } from '@/shared/lib/includes'

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export function isSupportedLanguage(
  value: unknown,
): value is SupportedLanguage {
  return typeof value === 'string' && includesValue(SUPPORTED_LANGUAGES, value)
}
