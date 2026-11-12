import { Component, useEffect, useRef } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation()
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-page py-section">
      <div role="alert">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-title font-semibold text-danger"
        >
          {t('error.heading')}
        </h1>
        <p className="mt-2 text-body text-text">{t('error.description')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={onReset}>{t('error.retry')}</Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            {t('error.reload')}
          </Button>
          <a
            href="/"
            className="self-center text-primary underline underline-offset-2"
          >
            {t('error.home')}
          </a>
        </div>
      </div>
    </main>
  )
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    console.error('[walday] Unhandled render error', error.name)
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallback onReset={() => this.setState({ hasError: false })} />
      )
    }
    return this.props.children
  }
}
