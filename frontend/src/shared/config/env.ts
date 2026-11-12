import { z } from 'zod'

export const envSchema = z.object({
  VITE_API_BASE_URL: z.url().optional(),
})

export type AppEnv = z.infer<typeof envSchema>

export class EnvValidationError extends Error {
  constructor() {
    super(
      'Invalid environment configuration. Check the documented VITE_* variables.',
    )
    this.name = 'EnvValidationError'
  }
}

let currentEnv: AppEnv | null = null

export function parseEnv(source: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    throw new EnvValidationError()
  }
  return result.data
}

export function initEnv(
  source: Record<string, unknown> = import.meta.env,
): AppEnv {
  currentEnv = parseEnv(source)
  return currentEnv
}

export function getEnv(): AppEnv {
  if (!currentEnv) {
    return initEnv()
  }
  return currentEnv
}
