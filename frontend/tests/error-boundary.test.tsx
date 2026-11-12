import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../src/shared/ui/ErrorBoundary'
import '../src/shared/i18n'

function Boom(): never {
  throw new Error('boom')
}

describe('application error boundary (US5)', () => {
  it('renders a localized recovery surface and focuses its heading', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    const heading = screen.getByRole('heading', {
      level: 1,
      name: /something went wrong/i,
    })
    expect(heading).toBeInTheDocument()
    await waitFor(() => expect(heading).toHaveFocus())
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /go to the home page/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument()
    expect(spy).toHaveBeenCalledWith('[walday] Unhandled render error', 'Error')
    spy.mockRestore()
  })
})
