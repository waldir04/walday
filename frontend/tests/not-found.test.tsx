import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../src/shared/i18n'
import { renderApp } from './helpers/renderApp'

describe('not-found recovery (US2)', () => {
  it('shows a localized explanation and a working home link for an unknown nested path', async () => {
    const { router } = renderApp(['/unknown/deep/path'])

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /we could not find that page/i,
      }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/unknown/deep/path')

    fireEvent.click(screen.getByRole('link', { name: /go to the home page/i }))
    expect(
      await screen.findByRole('heading', { level: 1, name: /^Walday$/i }),
    ).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
