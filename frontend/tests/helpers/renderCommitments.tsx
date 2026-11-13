import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { CommitmentsPage } from '@/pages/CommitmentsPage'

export function renderCommitmentsPage(
  initialEntries: string[] = ['/commitments'],
) {
  const router = createMemoryRouter(
    [
      {
        path: '/commitments',
        element: <CommitmentsPage />,
        handle: { titleKey: 'title', titleNamespace: 'commitments' },
      },
      { path: '/', element: <p>Home</p> },
    ],
    { initialEntries },
  )

  const view = render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )

  return { router, ...view }
}
