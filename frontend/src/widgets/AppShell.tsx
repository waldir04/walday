import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface text-gray-900">
      <Navigation />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}