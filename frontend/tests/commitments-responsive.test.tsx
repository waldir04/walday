import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { renderCommitmentsPage } from './helpers/renderCommitments'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('commitments responsive behavior', () => {
  it.each([360, 768, 1024, 1440])(
    'renders the full flow at %ipx without hover-only actions',
    (width) => {
      window.innerWidth = width
      window.dispatchEvent(new Event('resize'))
      renderCommitmentsPage(['/commitments?date=2026-11-10'])

      const save = screen.getByRole('button', { name: 'Save' })
      expect(save).toBeInTheDocument()
      expect(save.className).toContain('min-h-11')
      expect(save.className).toContain('min-w-11')
      expect(
        screen.getByRole('button', { name: 'Previous day' }),
      ).toBeInTheDocument()
      fireEvent.change(screen.getByLabelText('Title'), {
        target: { value: `Layout ${width}` },
      })
      expect(screen.getByLabelText('Title')).toHaveValue(`Layout ${width}`)
    },
  )
})
