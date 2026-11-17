/**
 * Query-key factory convention.
 *
 * Root keys are hierarchical arrays. Feature/entity resources extend the
 * factory instead of writing ad-hoc key arrays, so invalidation stays scoped.
 * The foundation intentionally defines no business resource keys.
 */
export const queryKeys = {
  all: ['walday'] as const,
  scope: (scope: string) => [...queryKeys.all, scope] as const,
  resource: (scope: string, resource: string) =>
    [...queryKeys.scope(scope), resource] as const,
  detail: (scope: string, resource: string, id: string) =>
    [...queryKeys.resource(scope, resource), id] as const,
  weather: (providerPlaceId: string, localDate: string) =>
    [
      ...queryKeys.scope('weather'),
      'snapshot',
      providerPlaceId,
      localDate,
    ] as const,
}
