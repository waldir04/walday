import { render, screen } from '@testing-library/react'
import App from '../src/App'

test('shell renders', () => {
  render(<App />)
  expect(screen.getAllByText('Walday').length).toBeGreaterThan(0)
})
