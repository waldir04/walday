import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { renderCommitmentsPage } from './helpers/renderCommitments'

const fetchSpy = vi.fn()
const xhrOpen = vi.fn()

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
  fetchSpy.mockClear()
  xhrOpen.mockClear()
  vi.stubGlobal('fetch', fetchSpy)
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(xhrOpen)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('commitments stay local', () => {
  it('never calls fetch, XHR, or a task store during create and edit flows', async () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Offline plan' },
    })
    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '09:00' },
    })
    fireEvent.change(screen.getByLabelText('End time'), {
      target: { value: '10:00' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /Fixed/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Commitment saved')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrOpen).not.toHaveBeenCalled()
    expect(localStorage.getItem('walday:tasks')).toBeNull()
  })
})
