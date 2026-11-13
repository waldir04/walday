import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { renderCommitmentsPage } from './helpers/renderCommitments'

function readLocale(locale: 'en' | 'es'): Record<string, unknown> {
  const path = resolve(
    process.cwd(),
    `src/shared/i18n/locales/${locale}/commitments.json`,
  )
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

function flattenKeys(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
      return flattenKeys(entry as Record<string, unknown>, path)
    }
    return [path]
  })
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('commitments localization', () => {
  it('keeps English and Spanish keys in parity', () => {
    const en = flattenKeys(readLocale('en')).sort()
    const es = flattenKeys(readLocale('es')).sort()
    expect(es).toEqual(en)
  })

  it('switches language without losing the draft and keeps document lang in sync', async () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Draft in progress' },
    })
    applyLanguage('es')

    await waitFor(() =>
      expect(screen.getByLabelText('Título')).toHaveValue('Draft in progress'),
    )
    expect(document.documentElement.lang).toBe('es')
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
    expect(screen.getByText(/solo en este navegador/i)).toBeInTheDocument()

    applyLanguage('en')
    await waitFor(() =>
      expect(screen.getByLabelText('Title')).toHaveValue('Draft in progress'),
    )
  })
})
