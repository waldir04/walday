import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { SuggestionCard } from '../src/features/suggestions/ui/SuggestionCard'
import { SuggestionAdjustDialog } from '../src/features/suggestions/ui/SuggestionAdjustDialog'
import { SuggestionDismissedReview } from '../src/features/suggestions/ui/SuggestionDismissedReview'
import { SmartSuggestions } from '../src/widgets/SmartSuggestions'
import type {
  SuggestionApplyOutcome,
  SuggestionView,
  SuggestionsSurfaceState,
} from '../src/features/suggestions'
import { applyLanguage } from '../src/shared/i18n'

function makeView(overrides: Partial<SuggestionView> = {}): SuggestionView {
  return {
    id: 'suggestion-1',
    category: 'conflict',
    targetTitle: 'Write report',
    activityKey: 'task:task-1',
    currentLabel: '9:00 AM – 10:00 AM',
    proposedLabel: '11:00 AM – 12:00 PM',
    proposedStartMinutes: 660,
    durationMinutes: 60,
    change: {
      kind: 'move-task',
      taskId: 'task-1',
      plannedDate: '2026-11-18',
      fromStartMinutes: 540,
      fromEndMinutes: 600,
      startMinutes: 660,
      endMinutes: 720,
      durationMinutes: 60,
      current: { startMinutes: 540, endMinutes: 600 },
    },
    changeSignature: 'move-task:task-1:2026-11-18:540-600:660-720',
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
    ...overrides,
  }
}

function readyState(
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

function renderWidget(
  state: SuggestionsSurfaceState,
  overrides: Record<string, unknown> = {},
) {
  return render(
    <MemoryRouter>
      <SmartSuggestions
        state={state}
        locale="en-US"
        dateStyle="medium"
        weatherUnit="metric"
        onAccept={vi.fn(async () => undefined)}
        onAdjust={vi.fn(async () => ({
          ok: true as const,
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

function renderWithRouter(children: ReactNode) {
  return render(<MemoryRouter>{children}</MemoryRouter>)
}

beforeEach(() => {
  applyLanguage('en')
})

describe('SuggestionCard', () => {
  it('renders one list item with a level-three heading and category pill', () => {
    renderWithRouter(
      <ul>
        <SuggestionCard
          suggestion={makeView()}
          locale="en-US"
          dateStyle="medium"
          weatherUnit="metric"
          pending={false}
          onAccept={() => undefined}
          onAdjust={() => undefined}
          onDismiss={() => undefined}
        />
      </ul>,
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Move Write report',
    )
    expect(screen.getByText('Conflict')).toBeInTheDocument()
    expect(screen.getByText(/9:00 AM – 10:00 AM/)).toBeInTheDocument()
    expect(screen.getByText(/11:00 AM – 12:00 PM/)).toBeInTheDocument()
    expect(screen.getByText(/Team sync/)).toBeInTheDocument()
    expect(
      screen.getByText(/Fixed commitments are protected/),
    ).toBeInTheDocument()
  })

  it('names the activity and proposed time in every action label', () => {
    renderWithRouter(
      <ul>
        <SuggestionCard
          suggestion={makeView()}
          locale="en-US"
          dateStyle="medium"
          weatherUnit="metric"
          pending={false}
          onAccept={() => undefined}
          onAdjust={() => undefined}
          onDismiss={() => undefined}
        />
      </ul>,
    )

    expect(
      screen.getByRole('button', {
        name: /Accept.*Write report.*11:00 AM – 12:00 PM/,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Adjust the time for Write report/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Dismiss the suggestion for Write report/,
      }),
    ).toBeInTheDocument()
  })

  it('disables all actions while pending', () => {
    renderWithRouter(
      <ul>
        <SuggestionCard
          suggestion={makeView()}
          locale="en-US"
          dateStyle="medium"
          weatherUnit="metric"
          pending
          onAccept={() => undefined}
          onAdjust={() => undefined}
          onDismiss={() => undefined}
        />
      </ul>,
    )

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })

  it('renders remaining overlaps and weather as text', () => {
    const view = makeView({
      weatherEvidence: {
        basis: 'precipitation',
        chosenStartMinutes: 660,
        chosenEndMinutes: 720,
        chosenCondition: 'clear',
        chosenPrecipitationProbability: 10,
        comparedCondition: 'rain',
        comparedPrecipitationProbability: 80,
      },
      reasons: [
        {
          kind: 'conflict',
          conflictingTitles: ['Team sync', 'Deep work'],
          overlapStartMinutes: 540,
          overlapEndMinutes: 600,
          fixedProtected: false,
          remainingOverlaps: [
            {
              titles: ['Team sync', 'Deep work'],
              overlapStartMinutes: 550,
              overlapEndMinutes: 590,
            },
          ],
        },
      ],
    })
    renderWithRouter(
      <ul>
        <SuggestionCard
          suggestion={view}
          locale="en-US"
          dateStyle="medium"
          weatherUnit="metric"
          pending={false}
          onAccept={() => undefined}
          onAdjust={() => undefined}
          onDismiss={() => undefined}
        />
      </ul>,
    )

    expect(screen.getAllByText(/still leaves/).length).toBeGreaterThan(0)
    expect(
      screen.getByText(/Weather influenced this choice/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Clear/)).toBeInTheDocument()
    expect(screen.getByText(/10%/)).toBeInTheDocument()
  })
})

describe('SuggestionAdjustDialog', () => {
  function renderDialog(
    overrides: {
      conflictsFor?: () => {
        title: string
        startMinutes: number
        endMinutes: number
      }[]
      onConfirm?: (input: {
        startTime: string
        acknowledged: boolean
      }) => Promise<SuggestionApplyOutcome>
      onClose?: () => void
    } = {},
  ) {
    const onConfirm = vi.fn(
      overrides.onConfirm ??
        (async () => ({ ok: true as const, appliedId: 'suggestion-1' })),
    )
    render(
      <SuggestionAdjustDialog
        open
        suggestion={makeView()}
        locale="en-US"
        dateStyle="medium"
        conflictsFor={overrides.conflictsFor ?? (() => [])}
        pending={false}
        onConfirm={onConfirm}
        onClose={overrides.onClose ?? (() => undefined)}
      />,
    )
    return { onConfirm }
  }

  it('shows current, originally proposed and adjusted times with read-only duration', () => {
    renderDialog()
    expect(screen.getByText(/Current time: 9:00 AM/)).toBeInTheDocument()
    expect(
      screen.getByText(/Originally proposed: 11:00 AM/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Adjusted time/)).toBeInTheDocument()
    expect(screen.getByText(/Duration: 1 hour/)).toBeInTheDocument()
    expect(screen.queryByText('Duration', { selector: 'input' })).toBeNull()
  })

  it('updates the adjusted time and rejects invalid or late times', () => {
    renderDialog()
    const input = screen.getByLabelText('Start time')
    fireEvent.change(input, { target: { value: 'not-a-time' } })
    expect(screen.getByText(/Enter a valid time/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply change' })).toBeDisabled()

    fireEvent.change(input, { target: { value: '23:30' } })
    expect(screen.getByText(/must end by midnight/)).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '10:30' } })
    expect(screen.getByText(/10:30 AM – 11:30 AM/)).toBeInTheDocument()
  })

  it('names conflicts and requires acknowledgment before confirming', () => {
    renderDialog({
      conflictsFor: () => [
        { title: 'Team sync', startMinutes: 630, endMinutes: 690 },
      ],
    })
    expect(screen.getByText(/overlaps other activities/)).toBeInTheDocument()
    expect(screen.getAllByText(/Team sync/).length).toBeGreaterThan(0)
    const confirm = screen.getByRole('button', { name: 'Apply change' })
    expect(confirm).toBeDisabled()

    fireEvent.click(
      screen.getByLabelText('Use this time even though it overlaps'),
    )
    expect(confirm).toBeEnabled()
  })

  it('cancels without applying', () => {
    const onClose = vi.fn()
    const { onConfirm } = renderDialog({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('keeps the dialog values and shows an error when the save fails', async () => {
    const { onConfirm } = renderDialog({
      onConfirm: async () => ({
        ok: false,
        code: 'apply-failed',
        retryable: true,
        conflicts: [],
      }),
    })

    const input = screen.getByLabelText('Start time')
    fireEvent.change(input, { target: { value: '12:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply change' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent(
      /The change did not happen/,
    )
    expect(input).toHaveValue('12:00')
    expect(onConfirm).toHaveBeenCalledWith({
      startTime: '12:00',
      acknowledged: false,
    })
  })
})

describe('SuggestionDismissedReview', () => {
  it('hides dismissed items until expanded and restores without applying', () => {
    const onRestore = vi.fn()
    const dismissed = [
      makeView({ id: 'dismissed-1', targetTitle: 'Dismissed task' }),
    ]
    const { container } = renderWithRouter(
      <SuggestionDismissedReview
        dismissed={dismissed}
        pendingId={null}
        onRestore={onRestore}
      />,
    )

    expect(screen.queryByText('Dismissed task')).toBeNull()
    const toggle = screen.getByRole('button', {
      name: 'Review dismissed suggestions',
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Dismissed task')).toBeInTheDocument()
    expect(container.querySelector('ul')).not.toBeNull()

    fireEvent.click(
      screen.getByRole('button', {
        name: /Restore the suggestion for Dismissed task/,
      }),
    )
    expect(onRestore).toHaveBeenCalledWith('dismissed-1')
  })
})

describe('SmartSuggestions states and responsive contract', () => {
  it('shows a busy skeleton while loading without exposing cards', () => {
    const { container } = renderWidget({ status: 'loading' })
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole('listitem')).toBeNull()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Smart Suggestions' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Loading suggestions')).toBeInTheDocument()
  })

  it('renders incomplete and error states with retry and no cards', () => {
    const onRetry = vi.fn()
    renderWidget({ status: 'incomplete' }, { onRetry })
    expect(screen.getByText(/plan is incomplete/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalled()
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('renders no-suggestion reasons with a next action', () => {
    renderWidget(
      readyState({
        suggestions: [],
        noSuggestionReason: 'missing-durations',
      }),
    )
    expect(screen.getByText('No recommendations right now')).toBeInTheDocument()
    expect(screen.getByText(/Some tasks have no duration/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open Task Management' }),
    ).toHaveAttribute('href', '/tasks')
  })

  it('renders at most three cards and keeps every action visible', () => {
    const suggestions = Array.from({ length: 3 }, (_, index) =>
      makeView({
        id: `suggestion-${index}`,
        targetTitle: `Task ${index}`,
        activityKey: `task:${index}`,
      }),
    )
    const { container } = renderWidget(readyState({ suggestions }))

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('min-h-11')
    }
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}/i)
    expect(container.innerHTML).not.toContain('max-w-[360')
  })

  it('allocates exactly one polite live region and announces outcomes', () => {
    const { container } = renderWidget(
      readyState({ announcement: 'Moved Write report to 11:00.' }),
    )
    const liveRegions = container.querySelectorAll('[aria-live="polite"]')
    expect(liveRegions).toHaveLength(1)
    expect(liveRegions[0]).toHaveTextContent('Moved Write report to 11:00.')
  })

  it('shows the dismissed review alongside active cards', async () => {
    renderWidget(
      readyState({
        dismissed: [makeView({ id: 'dismissed', targetTitle: 'Old card' })],
      }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Review dismissed suggestions' }),
    )
    await waitFor(() => {
      expect(screen.getByText('Old card')).toBeInTheDocument()
    })
  })
})
