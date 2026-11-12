export interface SkeletonProps {
  lines?: number
  className?: string
}

export function Skeleton({ lines = 1, className = '' }: SkeletonProps) {
  const rows = Math.max(1, lines)
  return (
    <div aria-hidden="true" className={`space-y-stack ${className}`}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded-control bg-surface-subtle"
        />
      ))}
    </div>
  )
}
