import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import {
  PreferencesRoot,
  type PreferencesStoreDependencies,
} from '@/features/user-preferences'
import { SettingsPage } from '@/pages/SettingsPage'
import { RouteAnnouncer } from '@/app/RouteAnnouncer'

export interface RenderSettingsOptions {
  deps?: PreferencesStoreDependencies
  initialEntries?: string[]
}

export function renderSettings(options: RenderSettingsOptions = {}) {
  const router = createMemoryRouter(
    [
      {
        path: '/settings',
        element: (
          <div>
            <RouteAnnouncer />
            <SettingsPage />
          </div>
        ),
        handle: { titleKey: 'title', titleNamespace: 'preferences' },
      },
      { path: '/', element: <p>Home</p> },
    ],
    { initialEntries: options.initialEntries ?? ['/settings'] },
  )

  const view = render(
    <PreferencesRoot deps={options.deps}>
      <RouterProvider router={router} />
    </PreferencesRoot>,
  )

  return { router, ...view }
}
