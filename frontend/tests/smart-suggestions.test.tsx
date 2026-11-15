import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SmartSuggestions } from '../src/widgets/SmartSuggestions'
import '../src/shared/i18n'

describe('SmartSuggestions (US3)', () => {
  it('renders nothing for an empty ready list', () => {
    const { container } = render(
      <SmartSuggestions state={{ status: 'ready', suggestions: [] }} />,
    )
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Smart Suggestions')).not.toBeInTheDocument()
  })

  it('shows a busy mint surface while loading', () => {
    const { container } = render(
      <SmartSuggestions state={{ status: 'loading' }} />,
    )
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(container.innerHTML).toContain('bg-suggestion-surface')
  })

  it('renders titles and text rationales with no action controls', () => {
    const { container } = render(
      <SmartSuggestions
        state={{
          status: 'ready',
          suggestions: [
            {
              id: 's1',
              title: 'Group errands',
              reason: 'Three errands are near each other.',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Group errands')).toBeInTheDocument()
    expect(
      screen.getByText('Three errands are near each other.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(container.innerHTML).toContain('text-suggestion-text')
    expect(container.innerHTML).toContain('bg-suggestion-surface')
  })

  it('renders a calm localized error', () => {
    render(<SmartSuggestions state={{ status: 'error' }} />)
    expect(
      screen.getByText('Suggestions are unavailable right now.'),
    ).toBeInTheDocument()
  })
})
