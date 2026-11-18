import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import en from '../src/shared/i18n/locales/en/suggestions.json'
import es from '../src/shared/i18n/locales/es/suggestions.json'
import { SuggestionCard } from '../src/features/suggestions/ui/SuggestionCard'
import { SmartSuggestions } from '../src/widgets/SmartSuggestions'
import type {
  SuggestionApplyOutcome,
  SuggestionView,
  SuggestionsSurfaceState,
} from '../src/features/suggestions'
import { applyLanguage } from '../src/shared/i18n'

function flatten(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  )
}

function values(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (typeof value !== 'object' || value === null) return []
  return Object.values(value).flatMap(values)
}

function makeView(): SuggestionView {
  return {
    id: 'suggestion-1',
    category: 'slot',
    targetTitle: 'Send the report',
    activityKey: 'task:task-1',
    currentLabel: null,
    proposedLabel: '8:00 AM – 9:30 AM',
    proposedStartMinutes: 480,
    durationMinutes: 90,
    change: {
      kind: 'schedule-task',
      taskId: 'task-1',
      plannedDate: '2026-11-18',
      startMinutes: 480,
      endMinutes: 570,
      durationMinutes: 90,
      current: null,
    },
    changeSignature: 'schedule-task:task-1:2026-11-18:480-570',
    reasons: [
      {
        kind: 'fit',
        periodStartMinutes: 480,
        periodEndMinutes: 570,
        durationMinutes: 90,
      },
      { kind: 'due-date', urgency: 'due-today', dueDate: '2026-11-18' },
    ],
    weatherEvidence: {
      basis: 'precipitation',
      chosenStartMinutes: 480,
      chosenEndMinutes: 570,
      chosenCondition: 'clear',
      chosenPrecipitationProbability: 10,
      comparedCondition: 'rain',
      comparedPrecipitationProbability: 80,
    },
    durationLabel: '1 hora y 30 minutos',
  }
}

const ready: SuggestionsSurfaceState = {
  status: 'ready',
  suggestions: [makeView()],
  dismissed: [],
  noSuggestionReason: null,
  applyingId: null,
  applyError: null,
  announcement: null,
}

afterEach(() => {
  applyLanguage('en')
})

describe('suggestions i18n parity', () => {
  it('has identical key sets in English and Spanish', () => {
    expect(flatten(es).sort()).toEqual(flatten(en).sort())
  })

  it('does not claim optimality, guaranteed completion, required acceptance or vague benefits', () => {
    const forbidden = [
      'optimal',
      'guarantee',
      'guaranteed',
      'required',
      'productivity',
      'mood',
      'predicted success',
      'óptim',
      'garantiz',
      'obligatori',
      'productividad',
      'ánimo',
      'éxito previsto',
    ]
    const copy = [...values(en), ...values(es)].join(' ').toLowerCase()
    for (const word of forbidden) {
      expect(copy).not.toContain(word)
    }
  })

  it('keeps UI components free of literal user-facing sentences', () => {
    const uiDir = join(process.cwd(), 'src/features/suggestions/ui')
    const files = [
      ...readdirSync(uiDir)
        .filter((file) => file.endsWith('.tsx'))
        .map((file) => join(uiDir, file)),
      join(process.cwd(), 'src/widgets/SmartSuggestions.tsx'),
    ]

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      const visibleText = [
        ...source.matchAll(/>\s*([A-Z][a-z]+(?:\s+[a-z]+)+)\s*</g),
      ]
      expect(visibleText).toEqual([])
    }
  })
})

describe('suggestions localization', () => {
  it('renders locale-correct durations, times and precipitation', () => {
    applyLanguage('es')
    render(
      createElement(
        MemoryRouter,
        null,
        createElement(
          'ul',
          null,
          createElement(SuggestionCard, {
            suggestion: makeView(),
            locale: 'es-ES',
            dateStyle: 'medium',
            weatherUnit: 'metric',
            pending: false,
            onAccept: () => undefined,
            onAdjust: () => undefined,
            onDismiss: () => undefined,
          }),
        ),
      ),
    )

    expect(screen.getByText('Buscar hora')).toBeInTheDocument()
    expect(screen.getAllByText(/1 hora y 30 minutos/).length).toBeGreaterThan(0)
    expect(
      screen.getByText(/10.*probabilidad de precipitación/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Vence hoy/)).toBeInTheDocument()
  })

  it('updates all copy when the language changes without applying anything', async () => {
    const onAccept = vi.fn(async () => undefined)
    render(
      createElement(
        MemoryRouter,
        null,
        createElement(SmartSuggestions, {
          state: ready,
          locale: 'en-US',
          dateStyle: 'medium',
          weatherUnit: 'metric',
          onAccept,
          onAdjust: async (): Promise<SuggestionApplyOutcome> => ({
            ok: true,
            appliedId: 'suggestion-1',
          }),
          onDismiss: async () => undefined,
          onRestore: async () => undefined,
          onRetry: () => undefined,
        }),
      ),
    )

    expect(screen.getByText('Accept')).toBeInTheDocument()
    applyLanguage('es')
    await waitFor(() => {
      expect(screen.getByText('Aceptar')).toBeInTheDocument()
    })
    expect(
      screen.getByRole('heading', { name: 'Sugerencias inteligentes' }),
    ).toBeInTheDocument()
    expect(onAccept).not.toHaveBeenCalled()
  })
})
