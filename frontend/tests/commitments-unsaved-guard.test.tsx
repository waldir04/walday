import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { renderCommitmentsPage } from './helpers/renderCommitments'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('unsaved change protection', () => {
  it('warns before discarding a dirty form and preserves values when staying', () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Draft title' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(
      screen.getByRole('heading', { name: 'Discard unsaved changes?' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByLabelText('Title')).toHaveValue('Draft title')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })

  it('blocks date navigation while the draft is dirty', () => {
    const { router } = renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Draft title' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))

    expect(
      screen.getByRole('heading', { name: 'Discard unsaved changes?' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(router.state.location.search).toContain('date=2026-11-10')
  })
})
