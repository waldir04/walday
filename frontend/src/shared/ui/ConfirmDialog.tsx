import { useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  heading: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

function focusableElements(dialog: HTMLDialogElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled'))
}

export function ConfirmDialog({
  open,
  heading,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal()
      } else {
        dialog.setAttribute('open', '')
      }
    }

    cancelRef.current?.focus()

    return () => {
      if (dialog?.open) {
        if (typeof dialog.close === 'function') {
          dialog.close()
        } else {
          dialog.removeAttribute('open')
        }
      }
      const previous = previouslyFocused.current
      if (previous?.isConnected) {
        previous.focus()
      }
    }
  }, [open])

  if (!open) return null

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return

    const elements = focusableElements(dialog)
    if (elements.length === 0) {
      event.preventDefault()
      dialog.focus()
      return
    }

    const first = elements[0]
    const last = elements[elements.length - 1]
    if (!first || !last) return

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="confirm-dialog-heading"
      aria-describedby={description ? 'confirm-dialog-description' : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      className="w-full max-w-md rounded-card border border-border bg-surface p-section text-text shadow-card backdrop:bg-text/40"
    >
      <h2
        id="confirm-dialog-heading"
        className="text-title font-semibold text-text"
      >
        {heading}
      </h2>
      {description ? (
        <div id="confirm-dialog-description" className="mt-2 text-body">
          {description}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button buttonRef={cancelRef} variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </dialog>
  )
}
