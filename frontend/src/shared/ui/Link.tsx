import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'

export type LinkVariant = 'inline' | 'navigation'

export interface LinkProps {
  to: string
  variant?: LinkVariant
  className?: string
  children: ReactNode
  'aria-current'?: 'page' | undefined
}

const VARIANT_CLASSES: Record<LinkVariant, string> = {
  inline: 'text-primary underline underline-offset-2 hover:text-primary-hover',
  navigation:
    'inline-flex min-h-11 min-w-11 items-center rounded-control px-3 text-caption font-medium text-text-muted hover:bg-surface hover:text-primary',
}

export function Link({
  to,
  variant = 'inline',
  className = '',
  children,
  ...props
}: LinkProps) {
  return (
    <RouterLink
      to={to}
      className={`${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </RouterLink>
  )
}
