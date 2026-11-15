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
// eslint-disable-next-line no-restricted-imports -- tasks/skeleton.ts is a documented public entry that keeps the lazy route chunk out of the initial bundle.
import { TasksPageSkeleton } from '@/features/tasks/skeleton'
// eslint-disable-next-line no-restricted-imports -- preferences/skeleton.ts is a documented public entry that keeps the lazy route chunk out of the initial bundle.
import { PreferencesPageSkeleton } from '@/features/user-preferences/skeleton'
// eslint-disable-next-line no-restricted-imports -- commitments/skeleton.ts is a documented public entry that keeps the lazy route chunk out of the initial bundle.
import { CommitmentsPageSkeleton } from '@/features/commitments/skeleton'
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

function TasksLazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<TasksPageSkeleton />}>{children}</Suspense>
}

function SettingsLazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PreferencesPageSkeleton />}>{children}</Suspense>
}

function CommitmentsLazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<CommitmentsPageSkeleton />}>{children}</Suspense>
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
        handle: {
          titleKey: 'title',
          titleNamespace: 'home',
        } satisfies RouteHandle,
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
          <TasksLazyRoute>
            <TasksPage />
          </TasksLazyRoute>
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
          <SettingsLazyRoute>
            <SettingsPage />
          </SettingsLazyRoute>
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
          <CommitmentsLazyRoute>
            <CommitmentsPage />
          </CommitmentsLazyRoute>
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
