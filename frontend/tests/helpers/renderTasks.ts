import { render } from '@testing-library/react'
import { createElement } from 'react'
import { AppProviders } from '@/app/providers'
import { TasksPage } from '@/pages/TasksPage'

export function renderTasksPage() {
  return render(createElement(AppProviders, null, createElement(TasksPage)))
}
