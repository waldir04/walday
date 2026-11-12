/* eslint-disable react-refresh/only-export-components -- route definitions intentionally colocate lazy page factories. */
import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import {
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
} from 'react-router-dom'
import { AppShell } from '@/widgets/AppShell'
import { HomePage } from '@/pages/HomePage'
import { FoundationPage } from '@/pages/FoundationPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { Loading } from '@/shared/ui/Loading'
import { RouteError } from './RouteError'

const TasksPage = lazy(() =>
  import('@/pages/TasksPage').then((module) => ({ default: module.TasksPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)
const CommitmentsPage = lazy(() =>
  import('@/pages/CommitmentsPage').then((module) => ({
    default: module.CommitmentsPage,
  })),
)

export interface RouteHandle {
  titleKey: string
  titleNamespace?: string
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <HomePage />,
        handle: { titleKey: 'app.title' } satisfies RouteHandle,
        errorElement: <RouteError />,
      },
      {
        path: 'foundation',
        element: <FoundationPage />,
        handle: { titleKey: 'foundation.title' } satisfies RouteHandle,
        errorElement: <RouteError />,
      },
      {
        path: 'tasks',
        element: (
          <LazyRoute>
            <TasksPage />
          </LazyRoute>
        ),
        handle: {
          titleKey: 'title',
          titleNamespace: 'tasks',
        } satisfies RouteHandle,
        errorElement: <RouteError />,
      },
      {
        path: 'settings',
        element: (
          <LazyRoute>
            <SettingsPage />
          </LazyRoute>
        ),
        handle: {
          titleKey: 'title',
          titleNamespace: 'preferences',
        } satisfies RouteHandle,
        errorElement: <RouteError />,
      },
      {
        path: 'commitments',
        element: (
          <LazyRoute>
            <CommitmentsPage />
          </LazyRoute>
        ),
        handle: {
          titleKey: 'title',
          titleNamespace: 'commitments',
        } satisfies RouteHandle,
        errorElement: <RouteError />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
        handle: { titleKey: 'notFound.title' } satisfies RouteHandle,
        errorElement: <RouteError />,
      },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}

export function createTestRouter(initialEntries: string[] = ['/']) {
  return createMemoryRouter(routes, { initialEntries })
}
