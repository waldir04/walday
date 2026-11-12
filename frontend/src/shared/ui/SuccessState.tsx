export interface SuccessStateProps {
  message: string
  description?: string
}

export function SuccessState({ message, description }: SuccessStateProps) {
  return (
    <div role="status" aria-live="polite" className="text-body text-success">
      <p className="font-medium">{message}</p>
      {description ? <p className="mt-1 text-text">{description}</p> : null}
    </div>
  )
}
