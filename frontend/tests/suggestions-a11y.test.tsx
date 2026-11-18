import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SmartSuggestions } from '../src/widgets/SmartSuggestions'
import { SuggestionAdjustDialog } from '../src/features/suggestions/ui/SuggestionAdjustDialog'
import type {
  SuggestionApplyOutcome,
  SuggestionView,
  SuggestionsSurfaceState,
} from '../src/features/suggestions'
import { applyLanguage } from '../src/shared/i18n'
import { checkA11y, seriousViolations } from '../src/test/axe'

function makeView(id = 'suggestion-1', title = 'Write report'): SuggestionView {
  return {
    id,
    category: 'conflict',
    targetTitle: title,
    activityKey: `task:${id}`,
    currentLabel: '9:00 AM – 10:00 AM',
    proposedLabel: '11:00 AM – 12:00 PM',
    proposedStartMinutes: 660,
    durationMinutes: 60,
    change: {
      kind: 'move-task',
      taskId: id,
      plannedDate: '2026-11-18',
      fromStartMinutes: 540,
      fromEndMinutes: 600,
      startMinutes: 660,
      endMinutes: 720,
      durationMinutes: 60,
      current: { startMinutes: 540, endMinutes: 600 },
    },
    changeSignature: `move-task:${id}:2026-11-18:540-600:660-720`,
    reasons: [
      {
        kind: 'conflict',
        conflictingTitles: ['Team sync'],
        overlapStartMinutes: 540,
        overlapEndMinutes: 600,
        fixedProtected: true,
        remainingOverlaps: [],
      },
    ],
    weatherEvidence: null,
    durationLabel: '1 hour',
  }
}

function ready(
  overrides: Partial<
    Extract<SuggestionsSurfaceState, { status: 'ready' }>
  > = {},
): SuggestionsSurfaceState {
  return {
    status: 'ready',
    suggestions: [makeView()],
    dismissed: [],
    noSuggestionReason: null,
    applyingId: null,
    applyError: null,
    announcement: null,
    ...overrides,
  }
}

function renderSurface(state: SuggestionsSurfaceState) {
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
      />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  applyLanguage('en')
})

describe('suggestions accessibility', () => {
  it.each([
    ['loading', { status: 'loading' } as SuggestionsSurfaceState],
    ['ready', ready()],
    [
      'no-suggestion',
      ready({ suggestions: [], noSuggestionReason: 'day-already-planned' }),
    ],
    ['dismissed', ready({ dismissed: [makeView('dismissed', 'Old card')] })],
    ['incomplete', { status: 'incomplete' } as SuggestionsSurfaceState],
  ])(
    'has no serious automated violations in the %s state',
    async (_name, state) => {
      renderSurface(state)
      const results = await checkA11y(document.body)
      expect(seriousViolations(results)).toEqual([])
    },
  )

  it('describes the card by its reason paragraph and exposes one polite region', () => {
    const { container } = renderSurface(
      ready({ announcement: 'Moved Write report to 11:00.' }),
    )
    const item = screen.getByRole('listitem')
    const describedBy = item.getAttribute('aria-describedby')
    expect(describedBy).not.toBeNull()
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent(
      /Overlaps Team sync/,
    )
    expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1)
    expect(container.querySelectorAll('[aria-busy]')).toHaveLength(0)
  })

  it('keeps action names unique, visible and keyboard reachable', async () => {
    renderSurface(ready())
    const accept = screen.getByRole('button', {
      name: /Accept: move Write report/,
    })
    expect(accept.textContent).toBe('Accept')
    accept.focus()
    expect(accept).toHaveFocus()
    fireEvent.click(accept)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Accept: move Write report/ }),
      ).toHaveFocus()
    })
  })

  it('opens the adjust dialog with modal semantics and initial focus', () => {
    renderSurface(ready())
    fireEvent.click(
      screen.getByRole('button', {
        name: /Adjust the time for Write report/,
      }),
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Adjust suggestion')
    expect(screen.getByLabelText('Start time')).toHaveFocus()
  })

  it('closes the dialog on Escape and returns no focus trap', () => {
    const onClose = vi.fn()
    render(
      <SuggestionAdjustDialog
        open
        suggestion={makeView()}
        locale="en-US"
        dateStyle="medium"
        conflictsFor={() => []}
        pending={false}
        onConfirm={async () => ({ ok: true, appliedId: 'suggestion-1' })}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('does not make motion carry meaning on cards', async () => {
    const { container } = renderSurface(ready())
    const item = screen.getByRole('listitem')
    expect(item.className).not.toMatch(/animate-/)
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}/i)
    await waitFor(() => {
      expect(
        screen.getByText('Why this suggestion', { exact: false }),
      ).toBeInTheDocument()
    })
  })
})
