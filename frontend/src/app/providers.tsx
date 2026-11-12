import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { PreferencesProvider } from '@/features/user-preferences'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { queryClient } from './queryClient'

export interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider>{children}</PreferencesProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
