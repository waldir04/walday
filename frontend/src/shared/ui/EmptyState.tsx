import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  heading: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ heading, description, action }: EmptyStateProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 text-center">
      <Inbox aria-hidden="true" className="mx-auto mb-2 h-6 w-6 text-primary" />
      <h2 className="text-title font-semibold text-text">{heading}</h2>
      {description ? (
        <p className="mt-2 text-body text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </section>
  )
}
