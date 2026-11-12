import type {
  LocationCandidate,
  LocationResolutionResult,
  LocationResolver,
} from '@/features/user-preferences'

export interface FakeResolverCall {
  query: string
  language: string
}

export interface FakeLocationResolver extends LocationResolver {
  readonly calls: FakeResolverCall[]
  result: LocationResolutionResult
}

export function createFakeResolver(
  result: LocationResolutionResult,
): FakeLocationResolver {
  const calls: FakeResolverCall[] = []
  return {
    calls,
    result,
    async resolve(query, options) {
      calls.push({ query, language: options.language })
      return result
    },
  }
}

export function makeCandidate(
  overrides: Partial<LocationCandidate> = {},
): LocationCandidate {
  return {
    providerPlaceId: '3117735',
    name: 'Madrid',
    region: 'Community of Madrid',
    countryCode: 'ES',
    latitude: 40.4165,
    longitude: -3.7026,
    ...overrides,
  }
}
