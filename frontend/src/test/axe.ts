import axe from 'axe-core'
import type { AxeResults } from 'axe-core'

export async function checkA11y(
  container: Element = document.body,
): Promise<AxeResults> {
  return axe.run(container, {
    rules: {
      // jsdom has no layout engine, so automated contrast measurement is not
      // meaningful here. Contrast is verified by the token tests instead.
      'color-contrast': { enabled: false },
    },
  })
}

export function seriousViolations(
  results: AxeResults,
): AxeResults['violations'] {
  return results.violations.filter(
    (violation) =>
      violation.impact === 'critical' || violation.impact === 'serious',
  )
}
