import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
  buttonRef?: Ref<HTMLButtonElement>
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-text-inverse hover:bg-primary-hover',
  secondary:
    'border border-border-strong bg-surface text-text hover:bg-surface-raised',
  danger: 'bg-danger text-text-inverse hover:opacity-90',
  ghost: 'text-primary hover:bg-surface-raised',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  buttonRef,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={buttonRef}
      type={type}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-4 py-2 text-body font-medium disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
