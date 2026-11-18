export function formatWholePercent(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(value / 100)
  } catch {
    return `${value}%`
  }
}
