import type { ReactNode } from 'react'

export interface EmptyStateProps {
  heading: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ heading, description, action }: EmptyStateProps) {
  return (
    <section className="rounded-card border border-border bg-surface-subtle p-section text-center">
      <h2 className="text-title font-semibold text-text">{heading}</h2>
      {description ? (
        <p className="mt-2 text-body text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </section>
  )
}
