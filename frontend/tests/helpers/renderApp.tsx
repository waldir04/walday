import { render } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { createTestRouter } from '@/app/router'

export function renderApp(initialEntries: string[] = ['/']) {
  const router = createTestRouter(initialEntries)
  const view = render(
    createElement(
      AppProviders,
      null,
      createElement(RouterProvider, { router }),
    ),
  )
  return { router, ...view }
}

export function renderInsideRouter(
  ui: ReactElement,
  initialEntries: string[] = ['/'],
) {
  const router = createTestRouter(initialEntries)
  const view = render(
    createElement(
      AppProviders,
      null,
      createElement(RouterProvider, { router }),
    ),
  )
  return { router, ...view, ui }
}
