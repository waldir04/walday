import { describe, expect, it } from 'vitest'
import { bootstrap } from '../src/app/bootstrap'
import {
  EnvValidationError,
  getEnv,
  initEnv,
  parseEnv,
} from '../src/shared/config/env'

describe('environment configuration (US6)', () => {
  it('starts with no required variables', () => {
    expect(parseEnv({})).toEqual({ VITE_API_BASE_URL: undefined })
  })

  it('accepts an optional valid API base URL', () => {
    expect(parseEnv({ VITE_API_BASE_URL: 'https://api.example.com' })).toEqual({
      VITE_API_BASE_URL: 'https://api.example.com',
    })
  })

  it('fails fast with a safe message for an invalid URL', () => {
    try {
      parseEnv({ VITE_API_BASE_URL: 'not-a-url' })
      throw new Error('expected parseEnv to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError)
      expect((error as Error).message).toBe(
        'Invalid environment configuration. Check the documented VITE_* variables.',
      )
      expect((error as Error).message).not.toContain('not-a-url')
    }
  })

  it('initializes and exposes the validated configuration', () => {
    expect(
      initEnv({ VITE_API_BASE_URL: 'https://api.example.com' })
        .VITE_API_BASE_URL,
    ).toBe('https://api.example.com')
    expect(getEnv().VITE_API_BASE_URL).toBe('https://api.example.com')
  })
})

describe('bootstrap configuration gate (US6)', () => {
  it('fails fast before rendering the app when optional configuration is invalid', () => {
    const root = document.createElement('div')
    root.id = 'config-test-root'
    document.body.append(root)

    const rendered = bootstrap({
      rootId: 'config-test-root',
      envSource: { VITE_API_BASE_URL: 'not-a-url' },
    })

    expect(rendered).toBeNull()
    const alert = root.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert?.textContent).not.toContain('not-a-url')
    expect(root.querySelector('h1')?.textContent).toBe('Walday could not start')
    root.remove()
  })

  it('reports a missing root element without throwing', () => {
    expect(bootstrap({ rootId: 'missing-root', envSource: {} })).toBeNull()
  })
})
