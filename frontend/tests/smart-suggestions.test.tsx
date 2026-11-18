import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SmartSuggestions } from '../src/widgets/SmartSuggestions'
import type {
  SuggestionApplyOutcome,
  SuggestionView,
  SuggestionsSurfaceState,
} from '../src/features/suggestions'
import { applyLanguage } from '../src/shared/i18n'

function makeView(): SuggestionView {
  return {
    id: 'suggestion-1',
    category: 'slot',
    targetTitle: 'Clear the inbox',
    activityKey: 'task:task-1',
    currentLabel: null,
    proposedLabel: '8:00 AM – 9:00 AM',
    proposedStartMinutes: 480,
    durationMinutes: 60,
    change: {
      kind: 'schedule-task',
      taskId: 'task-1',
      plannedDate: '2026-11-18',
      startMinutes: 480,
      endMinutes: 540,
      durationMinutes: 60,
      current: null,
    },
    changeSignature: 'schedule-task:task-1:2026-11-18:480-540',
    reasons: [
      {
        kind: 'fit',
        periodStartMinutes: 480,
        periodEndMinutes: 540,
        durationMinutes: 60,
      },
    ],
    weatherEvidence: null,
    durationLabel: '1 hour',
  }
}

function renderSurface(
  state: SuggestionsSurfaceState,
  overrides: Partial<Parameters<typeof SmartSuggestions>[0]> = {},
) {
  return render(
    <MemoryRouter>
      <SmartSuggestions
        state={state}
        locale="en-US"
        dateStyle="medium"
        weatherUnit="metric"
        onAccept={vi.fn(async () => undefined)}
        onAdjust={vi.fn(async (): Promise<SuggestionApplyOutcome> => ({
          ok: true,
          appliedId: 'suggestion-1',
        }))}
        onDismiss={vi.fn(async () => undefined)}
        onRestore={vi.fn(async () => undefined)}
        onRetry={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  applyLanguage('en')
})

describe('SmartSuggestions surface', () => {
  it('shows a busy loading skeleton with one status', () => {
    const { container } = renderSurface({ status: 'loading' })
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByText('Loading suggestions')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('shows localized error and incomplete states with retry', () => {
    const onRetry = vi.fn()
    renderSurface({ status: 'error' }, { onRetry })
    expect(
      screen.getByText('Suggestions are unavailable right now.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument()
  })

  it('renders actionable cards with text reasons and a single live region', () => {
    const { container } = renderSurface({
      status: 'ready',
      suggestions: [makeView()],
      dismissed: [],
      noSuggestionReason: null,
      applyingId: null,
      applyError: null,
      announcement: null,
    })

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Schedule Clear the inbox',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Fits the free period/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Accept: schedule Clear the inbox/ }),
    ).toBeInTheDocument()
    expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1)
  })

  it('replaces the previously empty region with a no-suggestion explanation', () => {
    renderSurface({
      status: 'ready',
      suggestions: [],
      dismissed: [],
      noSuggestionReason: 'day-already-planned',
      applyingId: null,
      applyError: null,
      announcement: null,
    })

    expect(screen.getByText('No recommendations right now')).toBeInTheDocument()
    expect(screen.getByText(/Today is already planned/)).toBeInTheDocument()
  })

  it('disables actions and marks the surface busy while applying', () => {
    const { container } = renderSurface({
      status: 'ready',
      suggestions: [makeView()],
      dismissed: [],
      noSuggestionReason: null,
      applyingId: 'suggestion-1',
      applyError: null,
      announcement: null,
    })

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })
})
