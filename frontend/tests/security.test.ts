import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const srcRoot = resolve(process.cwd(), 'src')

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry)
    if (statSync(fullPath).isDirectory()) return collectSourceFiles(fullPath)
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : []
  })
}

const sources = collectSourceFiles(srcRoot).map((file) => ({
  file,
  content: readFileSync(file, 'utf8'),
}))

describe('security baseline (US6)', () => {
  it('does not use unsafe HTML injection', () => {
    for (const source of sources) {
      expect(source.content).not.toContain('dangerouslySetInnerHTML')
      expect(source.content).not.toMatch(/\.innerHTML\s*=/)
    }
  })

  it('does not evaluate strings or embed obvious secrets', () => {
    for (const source of sources) {
      expect(source.content).not.toMatch(/\beval\s*\(/)
      expect(source.content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/)
      expect(source.content).not.toMatch(/AKIA[0-9A-Z]{16}/)
    }
  })

  it('does not store authentication tokens in browser storage', () => {
    for (const source of sources) {
      expect(source.content).not.toMatch(
        /localStorage\.(setItem|getItem)\(\s*['"][^'"]*token/i,
      )
    }
  })

  it('opens external links with safe opener and referrer behavior', () => {
    for (const source of sources) {
      if (source.content.includes('target="_blank"')) {
        expect(source.content).toMatch(/rel="[^"]*noopener/)
        expect(source.content).toMatch(/rel="[^"]*noreferrer/)
      }
    }
  })
})
