import { render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RouteError } from '../src/app/RouteError'
import { AppProviders } from '../src/app/providers'
import '../src/shared/i18n'

function ThrowingRoute({ message }: { message: string }): never {
  throw new Error(message)
}

function renderErrorRoute(message: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: createElement(ThrowingRoute, { message }),
        errorElement: createElement(RouteError),
      },
    ],
    { initialEntries: ['/'] },
  )
  return render(
    createElement(
      AppProviders,
      null,
      createElement(RouterProvider, { router }),
    ),
  )
}

describe('route error surface (US5)', () => {
  it('contains a route error with recovery actions and focused heading', async () => {
    renderErrorRoute('render failure')
    const heading = await screen.findByRole('heading', {
      level: 1,
      name: /this page could not be loaded/i,
    })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /go to the home page/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/render failure/)).not.toBeInTheDocument()
  })

  it('offers chunk-specific retry copy for a failed dynamic import', async () => {
    renderErrorRoute('Failed to fetch dynamically imported module')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /this page failed to load/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
  })
})
