import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useDialogFocusTrap } from '@/shared/lib/useDialogFocusTrap'
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
  const { handleKeyDown, handleCancel } = useDialogFocusTrap({
    open,
    dialogRef,
    initialFocusRef: cancelRef,
    onClose: onCancel,
  })

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="confirm-dialog-heading"
      aria-describedby={description ? 'confirm-dialog-description' : undefined}
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 text-text shadow-card backdrop:bg-canvas/80"
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
