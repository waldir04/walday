import { Skeleton } from '@/shared/ui/Skeleton'

export function CommitmentsPageSkeleton() {
  return (
    <section aria-busy="true" aria-live="polite" className="grid gap-6">
      <Skeleton lines={1} className="max-w-xs" />
      <div className="rounded-card border border-border bg-surface p-section">
        <Skeleton lines={6} />
      </div>
      <div className="grid gap-3">
        <Skeleton lines={3} />
        <Skeleton lines={3} />
      </div>
    </section>
  )
}
