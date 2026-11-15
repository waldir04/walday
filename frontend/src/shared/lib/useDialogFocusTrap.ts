import { useCallback, useEffect, useRef } from 'react'
import type { KeyboardEvent, RefObject, SyntheticEvent } from 'react'

export interface DialogFocusTrapOptions {
  open: boolean
  dialogRef: RefObject<HTMLDialogElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
  onClose?: () => void
  lockScroll?: boolean
}

export interface DialogFocusTrap {
  handleKeyDown: (_event: KeyboardEvent<HTMLDialogElement>) => void
  handleCancel: (_event: SyntheticEvent<HTMLDialogElement>) => void
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function focusableElements(
  dialog: HTMLDialogElement | null,
): HTMLElement[] {
  if (!dialog) return []
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => !element.hasAttribute('disabled'))
}

function openDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog || dialog.open) return
  if (typeof dialog.showModal === 'function') {
    dialog.showModal()
  } else {
    dialog.setAttribute('open', '')
  }
}

function closeDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog?.open) return
  if (typeof dialog.close === 'function') {
    dialog.close()
  } else {
    dialog.removeAttribute('open')
  }
}

/**
 * Shared native-dialog behavior: modal open/close, focus entry and return,
 * Tab trapping, Escape handling, and optional background scroll locking.
 */
export function useDialogFocusTrap({
  open,
  dialogRef,
  initialFocusRef,
  onClose,
  lockScroll = false,
}: DialogFocusTrapOptions): DialogFocusTrap {
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const dialog = dialogRef.current
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    openDialog(dialog)

    const focusTarget =
      initialFocusRef?.current ?? focusableElements(dialog)[0] ?? dialog
    focusTarget?.focus()

    const previousOverflow = document.body.style.overflow
    if (lockScroll) document.body.style.overflow = 'hidden'

    return () => {
      closeDialog(dialog)
      if (lockScroll) document.body.style.overflow = previousOverflow
      const previous = previouslyFocused.current
      if (previous?.isConnected) previous.focus()
    }
  }, [open, dialogRef, initialFocusRef, lockScroll])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDialogElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      const elements = focusableElements(dialog)
      if (elements.length === 0) {
        event.preventDefault()
        dialog?.focus()
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
    },
    [dialogRef],
  )

  const handleCancel = useCallback(
    (event: SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault()
      onCloseRef.current?.()
    },
    [],
  )

  return { handleKeyDown, handleCancel }
}
