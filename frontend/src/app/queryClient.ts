import { QueryClient } from '@tanstack/react-query'

export const QUERY_DEFAULTS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: QUERY_DEFAULTS,
    mutations: {
      retry: 0,
    },
  },
})
