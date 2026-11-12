import { render } from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { queryClient, QUERY_DEFAULTS } from '../src/app/queryClient'
import { queryKeys } from '../src/app/queryKeys'
import { usePreferences } from '../src/entities/preferences'
import { AppProviders } from '../src/app/providers'

function QueryClientProbe() {
  const client = useQueryClient()
  const preferences = usePreferences()
  return (
    <output data-testid="probe">
      {String(client === queryClient)}:{preferences.effectiveLanguage}
    </output>
  )
}

describe('server-state foundation', () => {
  it('configures one QueryClient with deliberate defaults', () => {
    expect(queryClient).toBeInstanceOf(QueryClient)
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(
      QUERY_DEFAULTS.staleTime,
    )
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(
      QUERY_DEFAULTS.gcTime,
    )
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(1)
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(
      false,
    )
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(0)
  })

  it('composes the provider with the exported client and preferences provider', () => {
    const { getByTestId } = render(
      <AppProviders>
        <QueryClientProbe />
      </AppProviders>,
    )
    expect(getByTestId('probe').textContent).toMatch(/^true:/)
  })

  it('provides a hierarchical query-key factory convention', () => {
    expect(queryKeys.all).toEqual(['walday'])
    expect(queryKeys.scope('tasks')).toEqual(['walday', 'tasks'])
    expect(queryKeys.resource('tasks', 'list')).toEqual([
      'walday',
      'tasks',
      'list',
    ])
    expect(queryKeys.detail('tasks', 'list', '1')).toEqual([
      'walday',
      'tasks',
      'list',
      '1',
    ])
  })

  it('exports a standalone provider-compatible client type', () => {
    const standalone = new QueryClient()
    render(
      <QueryClientProvider client={standalone}>
        <p>Ready</p>
      </QueryClientProvider>,
    )
    expect(standalone).toBeInstanceOf(QueryClient)
  })
})
