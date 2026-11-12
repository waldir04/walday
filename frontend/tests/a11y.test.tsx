import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { checkA11y, seriousViolations } from '../src/test/axe'
import { renderApp } from './helpers/renderApp'

describe('automated accessibility checks (US3)', () => {
  it('has no serious violations on the shell and home page', async () => {
    renderApp(['/'])
    const results = await checkA11y(document.body)
    expect(seriousViolations(results)).toEqual([])
  })

  it('has no serious violations on the navigation', async () => {
    renderApp(['/tasks'])
    await screen.findByRole('heading', { level: 1 })
    const results = await checkA11y(screen.getByRole('navigation'))
    expect(seriousViolations(results)).toEqual([])
  })

  it('has no serious violations on the not-found page', async () => {
    renderApp(['/does/not/exist'])
    await screen.findByRole('heading', {
      level: 1,
      name: /we could not find that page/i,
    })
    const results = await checkA11y(document.body)
    expect(seriousViolations(results)).toEqual([])
  })

  it('has no serious violations on the route error surface', async () => {
    renderApp(['/tasks'])
    await waitFor(() => expect(document.title).toBe('Tasks'))
    const results = await checkA11y(document.body)
    expect(seriousViolations(results)).toEqual([])
  })
})
