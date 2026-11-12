import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

describe('no-JavaScript fallback (US1)', () => {
  it('sets the Walday base title', () => {
    expect(html).toMatch(/<title>Walday<\/title>/)
  })

  it('contains an accessible noscript message and does not present the app as functional', () => {
    expect(html).toMatch(/<noscript>[\s\S]*role="alert"[\s\S]*<\/noscript>/)
    expect(html).toMatch(/needs JavaScript/i)
    expect(html).not.toMatch(
      /<noscript>[\s\S]*<div id="root"><\/div>[\s\S]*<\/noscript>/,
    )
  })
})
