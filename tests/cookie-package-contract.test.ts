import { describe, expect, it } from 'vitest'
import {
  buildCookieExportFromScan,
  buildCookiePreviewScan,
} from '../cookie-export.js'
import { normalizeBrowserCookies } from '../src/domain/cookie-normalization'
import type { BrowserCookie } from '../src/platform/browser-adapter'
import { buildZip } from '../zip.js'

describe('Cookie package contract', () => {
  const generatedAt = new Date('2026-07-13T12:00:00+08:00')

  it('deduplicates a browser Cookie identity before building package rows', () => {
    const duplicate = browserCookie({ name: 'SESSDATA', value: 'synthetic-value' })
    const scan = buildCookiePreviewScan(
      normalizeBrowserCookies([duplicate, duplicate], generatedAt),
      'supported',
      generatedAt.toISOString(),
    )

    const bundle = buildCookieExportFromScan(scan, ['bilibili-b-site'])

    expect(bundle.cookies).toHaveLength(1)
    expect(bundle.manifest.total_cookie_lines).toBe(1)
  })

  it('keeps expiry boundaries stable at now and twenty-four hours', () => {
    const nowSeconds = Math.floor(generatedAt.getTime() / 1000)
    const cookies = normalizeBrowserCookies([
      browserCookie({ name: 'session', session: true, expirationDate: undefined }),
      browserCookie({ name: 'expired', expirationDate: nowSeconds - 1 }),
      browserCookie({ name: 'starts-soon', expirationDate: nowSeconds }),
      browserCookie({ name: 'ends-soon', expirationDate: nowSeconds + 86_399 }),
      browserCookie({ name: 'valid', expirationDate: nowSeconds + 86_400 }),
    ], generatedAt)

    expect(cookies.map(({ name, expiryStatus }) => [name, expiryStatus])).toEqual([
      ['session', 'session'],
      ['expired', 'expired'],
      ['starts-soon', 'soon'],
      ['ends-soon', 'soon'],
      ['valid', 'valid'],
    ])
  })

  it('uses safe paths and the documented manifest contract', () => {
    const scan = buildCookiePreviewScan(
      normalizeBrowserCookies([
        browserCookie({
          domain: '.evil/.com',
          name: 'SYNTHETIC',
          value: 'synthetic-value',
        }),
      ], generatedAt),
      'all',
      generatedAt.toISOString(),
    )
    const sourceSlug = scan.rules[0]?.slug
    expect(sourceSlug).toBe('domain-evil-.com')

    const bundle = buildCookieExportFromScan(scan, [sourceSlug])

    expect([...bundle.files.keys()]).toEqual([
      'cookies.txt',
      'by-service/domain-evil-.com.cookies.txt',
      'by-domain/evil_.com.cookies.txt',
      'manifest.json',
      'README.txt',
    ])
    expect([...bundle.files.keys()].every((path) => !path.includes('..'))).toBe(true)
    expect(bundle.manifest).toMatchObject({
      format: 'Netscape cookies.txt',
      generator: 'XF MediaCookies',
      total_cookie_lines: 1,
      privacy: {
        password_exported: false,
        cookie_values_in_manifest: false,
        network_upload: false,
      },
      outputs: {
        raw_file: 'cookies.txt',
        by_service_dir: 'by-service',
        by_domain_dir: 'by-domain',
      },
    })
    expect(JSON.stringify(bundle.manifest)).not.toContain('synthetic-value')
  })

  it('writes the complete Media Dock directory structure into the ZIP', async () => {
    const scan = buildCookiePreviewScan(
      normalizeBrowserCookies([browserCookie()], generatedAt),
      'supported',
      generatedAt.toISOString(),
    )
    const bundle = buildCookieExportFromScan(scan, ['bilibili-b-site'])
    const folder = 'MediaCookies_2026-07-13_12-00-00'
    const archive = buildZip(
      [...bundle.files.entries()].map(([path, content]) => ({
        path: `${folder}/${path}`,
        content,
      })),
      generatedAt,
    )
    const archiveText = new TextDecoder().decode(await archive.arrayBuffer())

    for (const path of [
      'cookies.txt',
      'by-service/bilibili-b-site.cookies.txt',
      'by-domain/bilibili.com.cookies.txt',
      'manifest.json',
      'README.txt',
    ]) {
      expect(archiveText).toContain(`${folder}/${path}`)
    }
  })
})

function browserCookie(overrides: Partial<BrowserCookie> = {}): BrowserCookie {
  return {
    domain: '.bilibili.com',
    expirationDate: 2_000_000_000,
    hostOnly: false,
    httpOnly: true,
    name: 'SESSDATA',
    path: '/',
    sameSite: 'lax',
    secure: true,
    session: false,
    storeId: '0',
    value: 'synthetic-value',
    ...overrides,
  }
}
