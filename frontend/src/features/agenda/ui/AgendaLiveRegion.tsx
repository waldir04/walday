export interface AgendaLiveRegionProps {
  message: string | null
}

/**
 * The agenda's single polite status region. The page owns every message, and
 * replacing the text announces a change without duplicating it.
 */
export function AgendaLiveRegion({ message }: AgendaLiveRegionProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="min-h-6 text-body text-text-muted"
    >
      {message}
    </div>
  )
}
