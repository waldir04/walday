import type { ReactNode } from 'react'

export interface ContainerProps {
  children: ReactNode
  className?: string
  as?: 'div' | 'section'
}

export function Container({
  children,
  className = '',
  as = 'div',
}: ContainerProps) {
  const Element = as
  return (
    <Element
      className={`mx-auto w-full max-w-6xl px-page sm:px-page-wide ${className}`}
    >
      {children}
    </Element>
  )
}
