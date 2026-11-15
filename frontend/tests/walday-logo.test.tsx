import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WaldayLogo } from '../src/shared/ui/WaldayLogo'

describe('WaldayLogo (US1)', () => {
  it('renders the inline monogram with the token-driven mint stroke', () => {
    const { container } = render(<WaldayLogo />)
    const svg = container.querySelector('svg')

    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('viewBox', '0 0 32 32')
    expect(svg).toHaveAttribute('stroke', 'currentColor')
    expect(svg).toHaveAttribute('stroke-width', '3.6')
    expect(svg).toHaveAttribute('fill', 'none')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
    expect(svg?.getAttribute('class')).toContain('text-primary')
    expect(svg?.querySelector('path')).toHaveAttribute(
      'd',
      'M5 10 L11 22 L16 13 L21 22 L27 10',
    )
  })

  it('shows the off-white wordmark by default and hides it on request', () => {
    const { container, rerender } = render(<WaldayLogo />)
    const wordmark = screen.getByText('Walday')
    expect(wordmark.className).toContain('text-text')
    expect(container.firstElementChild?.className).toContain('select-none')

    rerender(<WaldayLogo showText={false} />)
    expect(screen.queryByText('Walday')).not.toBeInTheDocument()
  })

  it('is not a raster or externally loaded image', () => {
    const { container } = render(<WaldayLogo />)
    expect(container.querySelector('img')).toBeNull()
  })
})
