import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
  scripts?: Record<string, string>
  engines?: Record<string, string>
}

const rootManifest = JSON.parse(
  readFileSync(resolve(process.cwd(), '../package.json'), 'utf8'),
) as PackageManifest
const frontendManifest = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as PackageManifest

const requiredScripts = [
  'lint',
  'typecheck',
  'test',
  'build',
  'test:coverage',
  'format:check',
]

describe('canonical script contract (US6)', () => {
  it('defines every canonical script in the frontend package', () => {
    for (const script of requiredScripts) {
      expect(frontendManifest.scripts?.[script]).toBeTruthy()
    }
  })

  it('delegates every canonical script from the repository root', () => {
    for (const script of requiredScripts) {
      expect(rootManifest.scripts?.[script]).toContain('--prefix frontend')
    }
  })

  it('pins Node.js 24 for local and CI parity', () => {
    expect(rootManifest.engines?.node).toContain('24')
    expect(frontendManifest.engines?.node).toContain('24')
  })
})

describe('git hook contract (US6)', () => {
  const preCommit = readFileSync(
    resolve(process.cwd(), '../.husky/pre-commit'),
    'utf8',
  )
  const prePush = readFileSync(
    resolve(process.cwd(), '../.husky/pre-push'),
    'utf8',
  )

  it('runs fast lint and formatting checks before commit', () => {
    expect(preCommit).toContain('lint-staged')
  })

  it('runs typecheck, coverage tests, and build before push', () => {
    expect(prePush).toContain('npm run typecheck')
    expect(prePush).toContain('npm run test:coverage')
    expect(prePush).toContain('npm run build')
  })
})
