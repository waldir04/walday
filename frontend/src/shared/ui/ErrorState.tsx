import type { ReactNode } from 'react'

export interface ErrorStateProps {
  heading: string
  description?: string
  action?: ReactNode
}

export function ErrorState({ heading, description, action }: ErrorStateProps) {
  return (
    <section
      role="alert"
      className="rounded-card border border-danger bg-surface p-section"
    >
      <h2 className="text-title font-semibold text-danger">{heading}</h2>
      {description ? (
        <p className="mt-2 text-body text-text">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  )
}
