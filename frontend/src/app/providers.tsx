import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
// eslint-disable-next-line no-restricted-imports -- preferences/root.ts is a documented narrow entry that keeps the preference UI out of the initial bundle.
import { PreferencesRoot } from '@/features/user-preferences/root'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { queryClient } from './queryClient'

export interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PreferencesRoot>{children}</PreferencesRoot>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
