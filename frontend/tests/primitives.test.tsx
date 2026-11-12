import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Button } from '../src/shared/ui/Button'
import { Container } from '../src/shared/ui/Container'
import { Link } from '../src/shared/ui/Link'
import { Skeleton } from '../src/shared/ui/Skeleton'

describe('shared UI primitives (US3)', () => {
  it('Button exposes its accessible name, target size, focus, and disabled state', () => {
    render(<Button>Continue</Button>)
    const button = screen.getByRole('button', { name: 'Continue' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.className).toContain('min-h-11')
    expect(button.className).toContain('min-w-11')
    button.focus()
    expect(button).toHaveFocus()
  })

  it('Button prevents interaction when disabled', () => {
    render(<Button disabled>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('Link renders a router link with an accessible name and target size', () => {
    render(
      <MemoryRouter>
        <Link to="/tasks" variant="navigation">
          Tasks
        </Link>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Tasks' })
    expect(link).toHaveAttribute('href', '/tasks')
    expect(link.className).toContain('min-h-11')
  })

  it('Container renders its children in a responsive max-width wrapper', () => {
    render(
      <Container>
        <p>Content</p>
      </Container>,
    )
    const content = screen.getByText('Content')
    expect(content.parentElement?.className).toContain('max-w-5xl')
    expect(content.parentElement?.className).toContain('px-page')
  })

  it('Skeleton hides decorative rows from assistive technology', () => {
    const { container } = render(<Skeleton lines={3} />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)
  })
})
