import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

function Harness() {
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(0)

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <output aria-label="confirmed count">{confirmed}</output>
      <ConfirmDialog
        open={open}
        heading="Delete task"
        description={<p>Delete this task? This cannot be undone.</p>}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          setConfirmed((count) => count + 1)
          setOpen(false)
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}

function openDialog() {
  render(<Harness />)
  const opener = screen.getByRole('button', { name: 'Open dialog' })
  opener.focus()
  fireEvent.click(opener)
  return screen.getByRole('dialog', { name: 'Delete task' })
}

describe('ConfirmDialog', () => {
  it('exposes dialog semantics, heading, and description', () => {
    const dialog = openDialog()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription(
      'Delete this task? This cannot be undone.',
    )
  })

  it('moves focus inside the dialog and contains Tab navigation', () => {
    const dialog = openDialog()
    const confirm = screen.getByRole('button', { name: 'Delete' })
    const cancel = screen.getByRole('button', { name: 'Cancel' })

    expect(cancel).toHaveFocus()

    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(confirm).toHaveFocus()

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(cancel).toHaveFocus()
  })

  it('cancels on Escape and restores focus to the invoking control', () => {
    const dialog = openDialog()
    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open dialog' })).toHaveFocus()
  })

  it('confirms with an explicit action and restores focus', () => {
    openDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('confirmed count')).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: 'Open dialog' })).toHaveFocus()
  })
})
