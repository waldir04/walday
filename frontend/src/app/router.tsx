import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '../widgets/AppShell'
import { HomePage } from '../pages/HomePage'
import { TasksPage } from '../pages/TasksPage'
import { SettingsPage } from '../pages/SettingsPage'
import { CommitmentsPage } from '../pages/CommitmentsPage'
import { NotFoundPage } from '../pages/NotFoundPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'commitments', element: <CommitmentsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}