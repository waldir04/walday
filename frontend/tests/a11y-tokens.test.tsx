import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '../src/shared/ui/Button'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

function tokenValue(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!match?.[1]) throw new Error(`missing token --${name}`)
  return match[1].trim().toLowerCase()
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) throw new Error(`not a hex color: ${hex}`)
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  if (lighter === undefined || darker === undefined)
    throw new Error('missing luminance')
  return (lighter + 0.05) / (darker + 0.05)
}

describe('design tokens and contrast (US2)', () => {
  it('defines the canonical dark palette and scales', () => {
    for (const token of [
      'color-canvas',
      'color-surface',
      'color-surface-raised',
      'color-border',
      'color-border-strong',
      'color-text',
      'color-text-muted',
      'color-text-inverse',
      'color-primary',
      'color-primary-hover',
      'color-primary-strong',
      'color-muted',
      'color-danger',
      'color-success',
      'color-warning',
      'color-focus',
      'color-warm',
      'color-cool',
      'color-suggestion-surface',
      'color-suggestion-surface-strong',
      'color-suggestion-text',
      'color-suggestion-cta',
      'color-tag-border',
      'color-tag-text',
      'text-display',
      'text-title',
      'text-body',
      'text-caption',
      'spacing-page',
      'radius-card',
      'radius-control',
      'shadow-card',
    ]) {
      expect(() => tokenValue(token)).not.toThrow()
    }
  })

  it('keeps the canonical canvas and section radius values', () => {
    expect(tokenValue('color-canvas')).toBe('#0b1215')
    expect(tokenValue('radius-card')).toBe('1rem')
    expect(tokenValue('radius-control')).toBe('0.5rem')
  })

  it('meets WCAG AA contrast for text and interface colors', () => {
    const surface = tokenValue('color-surface')
    for (const token of [
      'color-text',
      'color-text-muted',
      'color-primary',
      'color-danger',
      'color-success',
      'color-warning',
    ]) {
      expect(contrast(tokenValue(token), surface)).toBeGreaterThanOrEqual(4.5)
    }

    expect(
      contrast(tokenValue('color-border-strong'), surface),
    ).toBeGreaterThanOrEqual(3)
    expect(contrast(tokenValue('color-focus'), surface)).toBeGreaterThanOrEqual(
      3,
    )

    // The canonical border is decorative, not an interactive control boundary.
    expect(contrast(tokenValue('color-border'), surface)).toBeLessThan(3)
  })

  it('keeps the suggestion surface readable', () => {
    expect(
      contrast(
        tokenValue('color-suggestion-text'),
        tokenValue('color-suggestion-surface'),
      ),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(tokenValue('color-text'), tokenValue('color-suggestion-cta')),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('gives interactive primitives a minimum target size', () => {
    render(<Button>Continue</Button>)
    const button = screen.getByRole('button', { name: 'Continue' })
    expect(button.className).toContain('min-h-11')
    expect(button.className).toContain('min-w-11')
  })
})
