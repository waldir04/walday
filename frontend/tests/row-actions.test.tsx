import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RowActions } from '../src/shared/ui/RowActions'

const actions = [
  { id: 'edit', label: 'Edit Row', onSelect: vi.fn() },
  {
    id: 'delete',
    label: 'Delete Row',
    onSelect: vi.fn(),
    tone: 'danger' as const,
  },
]

function renderRowActions() {
  const view = render(
    <div className="group">
      <RowActions actions={actions} menuLabel="Actions for Row" />
    </div>,
  )
  return view
}

describe('RowActions (US2)', () => {
  it('renders fine-pointer inline actions with a fade reveal and reserved space', () => {
    const { container } = renderRowActions()
    const inline = container.querySelector('.row-actions-inline')

    expect(inline).not.toBeNull()
    expect(inline?.className).toContain('opacity-0')
    expect(inline?.className).toContain('group-hover:opacity-100')
    expect(inline?.className).toContain('group-focus-within:opacity-100')
    expect(inline?.className).toContain('transition-opacity')
    expect(inline?.className).toContain('duration-150')
    expect(within(inline as HTMLElement).getAllByRole('button')).toHaveLength(2)
  })

  it('keeps a persistent compact disclosure with 44 px targets', () => {
    const { container } = renderRowActions()
    const details = container.querySelector('details')
    const summary = details?.querySelector('summary')

    expect(details?.className).toContain('row-actions-compact')
    expect(summary?.className).toContain('min-h-11')
    expect(summary?.className).toContain('min-w-11')
    expect(summary?.className).toContain('border-border-strong')
  })

  it('exposes exactly one action set while closed and mounts actions on open', () => {
    const { container } = renderRowActions()
    const details = container.querySelector('details') as HTMLDetailsElement

    expect(within(details).queryAllByRole('button')).toHaveLength(0)
    expect(screen.getAllByRole('button', { name: 'Edit Row' })).toHaveLength(1)

    fireEvent.click(screen.getByText('Actions for Row'))

    expect(within(details).getAllByRole('button')).toHaveLength(2)
    expect(
      within(details).getByRole('button', { name: 'Delete Row' }).className,
    ).toContain('text-danger')
  })

  it('selects inline and compact actions through the same callbacks', () => {
    const onSelect = vi.fn()
    render(
      <RowActions
        menuLabel="Actions for Row"
        actions={[{ id: 'edit', label: 'Edit Row', onSelect }]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit Row' }))
    expect(onSelect).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Actions for Row'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit Row' })[1]!)
    expect(onSelect).toHaveBeenCalledTimes(2)
  })
})
