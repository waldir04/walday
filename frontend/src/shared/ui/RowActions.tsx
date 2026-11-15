import { useState } from 'react'
import type { Ref } from 'react'
import { MoreHorizontal } from 'lucide-react'

export interface RowActionView {
  id: string
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
  buttonRef?: Ref<HTMLButtonElement>
}

export interface RowActionsProps {
  actions: RowActionView[]
  menuLabel: string
  className?: string
}

function actionClasses(tone: RowActionView['tone']): string {
  const base =
    'inline-flex min-h-11 min-w-11 items-center rounded-control px-3 text-caption font-medium'
  return tone === 'danger'
    ? `${base} text-danger hover:bg-surface-raised`
    : `${base} text-text hover:bg-surface-raised hover:text-primary`
}

function actionList(actions: RowActionView[], placement: 'inline' | 'compact') {
  return actions.map((action) => (
    <button
      key={action.id}
      ref={placement === 'inline' ? action.buttonRef : undefined}
      type="button"
      aria-label={action.label}
      onClick={action.onSelect}
      className={actionClasses(action.tone)}
    >
      {action.label}
    </button>
  ))
}

/**
 * Row action affordances. Wide fine-pointer screens fade the inline controls in
 * on row hover or keyboard focus; narrow and coarse-pointer contexts keep a
 * persistent disclosure whose actions mount only while it is open.
 */
export function RowActions({
  actions,
  menuLabel,
  className = '',
}: RowActionsProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`flex shrink-0 items-center gap-1 ${className}`}>
      <div className="row-actions-inline items-center gap-1 opacity-0 transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100">
        {actionList(actions, 'inline')}
      </div>
      <details className="row-actions-compact flex-col" open={open}>
        <summary
          aria-label={menuLabel}
          onClick={(event) => {
            event.preventDefault()
            setOpen((current) => !current)
          }}
          className="inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-control border border-border-strong px-2 text-text-muted hover:bg-surface-raised hover:text-primary"
        >
          <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
          <span className="sr-only">{menuLabel}</span>
        </summary>
        {open ? (
          <div className="mt-1 flex flex-col gap-1">
            {actionList(actions, 'compact')}
          </div>
        ) : null}
      </details>
    </div>
  )
}
