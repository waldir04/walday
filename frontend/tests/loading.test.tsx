import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Loading } from '../src/shared/ui/Loading'
import '../src/shared/i18n'

describe('loading state (US5)', () => {
  it('announces a busy region and hides decorative skeletons from assistive technology', () => {
    const { container } = render(<Loading />)
    const region = container.firstElementChild
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText(/loading content/i)).toBeInTheDocument()
    const decorative = container.querySelectorAll('[aria-hidden="true"]')
    expect(decorative.length).toBeGreaterThan(0)
    expect(screen.queryByText(/Loading…/)).not.toBeInTheDocument()
  })
})
