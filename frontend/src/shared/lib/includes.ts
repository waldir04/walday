export function includesValue<T extends string>(
  values: readonly T[],
  value: string,
): value is T {
  return values.some((item) => item === value)
}
