import { Link } from 'react-router-dom'

export function Navigation() {
  return (
    <nav className="border-b border-gray-200 px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <Link to="/" className="font-semibold">Walday</Link>
        <Link to="/tasks" className="text-sm text-gray-600">Tasks</Link>
        <Link to="/settings" className="text-sm text-gray-600">Settings</Link>
      </div>
    </nav>
  )
}