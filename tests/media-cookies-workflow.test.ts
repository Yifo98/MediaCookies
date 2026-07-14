import { describe, expect, it } from 'vitest'
import { SERVICE_RULES } from '../service-rules.js'
import { createMediaCookiesWorkflow } from '../src/application/media-cookies-workflow'
import { InMemoryBrowserAdapter } from '../src/testing/in-memory-browser-adapter'

describe('MediaCookies workflow', () => {
  const now = new Date('2026-07-13T12:00:00+08:00')
  const localNoon = new Date(2026, 6, 13, 12, 0, 0)
  const nowSeconds = Math.floor(now.getTime() / 1000)

  it('preserves the curated source IDs used by Media Dock packages and saved profiles', () => {
    expect(SERVICE_RULES.map((rule) => rule.slug)).toEqual([
      'bilibili-b-site',
      'youtube',
      'douyin',
      'tiktok',
    ])
  })

  it('asks for source access without reading Cookie values first', async () => {
    const browser = new InMemoryBrowserAdapter({
      currentUrl: 'https://www.youtube.com/watch?v=synthetic',
      cookies: [
        {
          domain: '.youtube.com',
          expirationDate: 2_000_000_000,
          hostOnly: false,
          httpOnly: true,
          name: 'LOGIN_INFO',
          path: '/',
          sameSite: 'lax',
          secure: true,
          session: false,
          storeId: '0',
          value: 'must-not-be-read-before-access',
        },
      ],
    })
    const workflow = createMediaCookiesWorkflow({ browser })

    await expect(workflow.inspectCurrentSource()).resolves.toMatchObject({
      source: { slug: 'youtube' },
      access: 'required',
    })
    expect(browser.cookieReadCount).toBe(0)
  })

  it('reads only the current source domains after source access is granted', async () => {
    const browser = new InMemoryBrowserAdapter({
      currentUrl: 'https://www.bilibili.com/video/BV1ScopedRead',
      grantedOrigins: bilibiliOrigins,
      cookies: [
        bilibiliCookie('SESSDATA', nowSeconds + 7 * 24 * 60 * 60),
        {
          ...bilibiliCookie('unrelated', nowSeconds + 7 * 24 * 60 * 60),
          domain: '.example.com',
          value: 'must-not-enter-current-source-read',
        },
      ],
    })
    const workflow = createMediaCookiesWorkflow({ browser, now: () => now })

    await expect(workflow.inspectCurrentSource()).resolves.toMatchObject({ status: 'ready' })
    expect(browser.cookieDomainRequests).toEqual([[
      'bilibili.com',
      'bilibili.cn',
      'biligame.com',
      'live.bilibili.com',
    ]])
  })

  it.each([
    {
      label: '可以导出',
      currentUrl: 'https://www.bilibili.com/video/BV1Ready',
      cookies: [bilibiliCookie('SESSDATA', nowSeconds + 7 * 24 * 60 * 60)],
      status: 'ready',
    },
    {
      label: '可能失效',
      currentUrl: 'https://www.bilibili.com/video/BV1Soon',
      cookies: [bilibiliCookie('SESSDATA', nowSeconds + 60 * 60)],
      status: 'at-risk',
    },
    {
      label: '请先登录',
      currentUrl: 'https://www.bilibili.com/video/BV1SignedOut',
      cookies: [],
      status: 'sign-in',
    },
    {
      label: '当前网页不支持',
      currentUrl: 'https://example.com/',
      cookies: [],
      status: 'unsupported',
    },
  ])('reports $label through the quick-export workflow', async ({ currentUrl, cookies, status }) => {
    const browser = new InMemoryBrowserAdapter({
      currentUrl,
      grantedOrigins: bilibiliOrigins,
      cookies,
    })
    const workflow = createMediaCookiesWorkflow({ browser, now: () => now })

    await expect(workflow.inspectCurrentSource()).resolves.toMatchObject({ status })
  })

  it('keeps source-access denial recoverable without reading or downloading Cookie values', async () => {
    const browser = new InMemoryBrowserAdapter({
      currentUrl: 'https://www.youtube.com/watch?v=denied',
      cookies: [],
      grantRequests: false,
    })
    const workflow = createMediaCookiesWorkflow({ browser })

    await expect(workflow.exportCurrentSource()).rejects.toMatchObject({
      code: 'SOURCE_ACCESS_DENIED',
      recoverable: true,
    })
    expect(browser.cookieReadCount).toBe(0)
    expect(browser.downloads).toHaveLength(0)
    await expect(workflow.inspectCurrentSource()).resolves.toMatchObject({
      access: 'required',
    })
  })

  it('requests current-source access but does not download an empty package when sign-in is missing', async () => {
    const browser = new InMemoryBrowserAdapter({
      currentUrl: 'https://www.bilibili.com/video/BV1NeedsSignIn',
      cookies: [],
    })
    const workflow = createMediaCookiesWorkflow({ browser, now: () => now })

    await expect(workflow.exportCurrentSource()).rejects.toMatchObject({
      code: 'CURRENT_SOURCE_SIGN_IN_REQUIRED',
      recoverable: true,
    })
    expect(browser.originRequests).toEqual([bilibiliOrigins])
    expect(browser.downloads).toHaveLength(0)
  })

  it.each([
    {
      currentUrl: 'https://vimeo.com/123456',
      sourceSlug: 'yt-dlp-vimeo-vimeo.com',
    },
    {
      currentUrl: 'https://www.google.com/search?q=media',
      sourceSlug: null,
    },
  ])('recognizes the current media source for $currentUrl', async ({ currentUrl, sourceSlug }) => {
    const browser = new InMemoryBrowserAdapter({ currentUrl })
    const workflow = createMediaCookiesWorkflow({ browser })

    const passport = await workflow.inspectCurrentSource()
    expect(passport.source?.slug ?? null).toBe(sourceSlug)
  })

  it('scans supported sources only after explicit broad access and returns no Cookie values', async () => {
    const browser = new InMemoryBrowserAdapter({
      currentUrl: 'chrome-extension://synthetic/workbench.html',
      cookies: [
        bilibiliCookie('SESSDATA', nowSeconds + 7 * 24 * 60 * 60),
        {
          ...bilibiliCookie('unrelated', nowSeconds + 7 * 24 * 60 * 60),
          domain: '.example.com',
          value: 'workbench-secret-must-not-leak',
        },
      ],
    })
    const workflow = createMediaCookiesWorkflow({ browser, now: () => now })

    const snapshot = await workflow.scanAllSources('supported')

    expect(browser.originRequests).toEqual([['https://*/*']])
    expect(snapshot.sources.map((source) => source.slug)).toEqual(['bilibili-b-site'])
    expect(snapshot.previewRows[0]).toMatchObject({
      domain: '.bilibili.com',
      name: 'SESSDATA',
      status: 'valid',
    })
    expect(JSON.stringify(snapshot)).not.toContain('synthetic-sessdata')
    expect(JSON.stringify(snapshot)).not.toContain('workbench-secret-must-not-leak')
  })

  it('keeps non-media Cookie domains out of the recommended scan and includes them in the all-domain scan', async () => {
    const browser = new InMemoryBrowserAdapter({
      grantedOrigins: ['https://*/*'],
      cookies: [
        bilibiliCookie('buvid3', nowSeconds + 7 * 24 * 60 * 60),
        {
          ...bilibiliCookie('MC_TEST', nowSeconds + 7 * 24 * 60 * 60),
          domain: '.example.com',
        },
        {
          ...bilibiliCookie('VIMEO_TEST', nowSeconds + 7 * 24 * 60 * 60),
          domain: '.vimeo.com',
        },
      ],
    })
    const workflow = createMediaCookiesWorkflow({ browser, now: () => now })

    const mediaSites = await workflow.scanAllSources('supported')
    expect(mediaSites.sources.map((source) => source.slug)).toEqual([
      'bilibili-b-site',
      'yt-dlp-vimeo-vimeo.com',
    ])
    expect(mediaSites.ignoredCookieCount).toBe(1)
    expect(mediaSites.sources[0]?.status).toBe('at-risk')

    const allDomains = await workflow.scanAllSources('all')
    expect(allDomains.sources.map((source) => source.slug)).toEqual([
      'bilibili-b-site',
      'domain-example.com',
      'domain-vimeo.com',
    ])
    expect(allDomains.ignoredCookieCount).toBe(0)
    expect(allDomains.sources.map((source) => source.status)).toEqual([
      'at-risk',
      'at-risk',
      'at-risk',
    ])
  })

  it('opens the workbench with a recommended media-site scan intent only after broad access is granted', async () => {
    const browser = new InMemoryBrowserAdapter()
    const workflow = createMediaCookiesWorkflow({ browser, now: () => now })

    await workflow.openWorkbench('supported')

    expect(browser.originRequests).toEqual([['https://*/*']])
    expect(browser.cookieReadCount).toBe(0)
    expect(browser.workbenchOpenRequests).toEqual(['supported'])
  })

  it('opens the workbench without requesting broad access when no automatic scan was chosen', async () => {
    const browser = new InMemoryBrowserAdapter()
    const workflow = createMediaCookiesWorkflow({ browser, now: () => now })

    await workflow.openWorkbench()

    expect(browser.originRequests).toEqual([])
    expect(browser.cookieReadCount).toBe(0)
    expect(browser.workbenchOpenRequests).toEqual([null])
  })

  it('does not open or read browser Cookies when browser-wide scan access is denied', async () => {
    const browser = new InMemoryBrowserAdapter({ grantRequests: false })
    const workflow = createMediaCookiesWorkflow({ browser, now: () => now })

    await expect(workflow.openWorkbench('all')).rejects.toMatchObject({
      code: 'ALL_SOURCE_ACCESS_DENIED',
      recoverable: true,
    })
    expect(browser.cookieReadCount).toBe(0)
    expect(browser.workbenchOpenRequests).toEqual([])
  })

  it('exports selected workbench sources and discards the temporary scan afterwards', async () => {
    const browser = new InMemoryBrowserAdapter({
      currentUrl: 'chrome-extension://synthetic/workbench.html',
      grantedOrigins: ['https://*/*'],
      cookies: [bilibiliCookie('SESSDATA', nowSeconds + 7 * 24 * 60 * 60)],
    })
    const workflow = createMediaCookiesWorkflow({ browser, now: () => localNoon })

    await workflow.scanAllSources('supported')
    await expect(workflow.exportSelectedSources(['bilibili-b-site'])).resolves.toMatchObject({
      sourceSlugs: ['bilibili-b-site'],
      cookieCount: 1,
    })
    expect(browser.downloads).toHaveLength(1)
    expect(browser.downloads[0]?.filename).toBe('MediaCookies_2026-07-13_12-00-00.zip')

    await expect(workflow.exportSelectedSources(['bilibili-b-site'])).rejects.toMatchObject({
      code: 'TEMPORARY_SCAN_REQUIRED',
      recoverable: true,
    })
  })

  it('lets the workbench explicitly discard a temporary scan', async () => {
    const browser = new InMemoryBrowserAdapter({
      grantedOrigins: ['https://*/*'],
      cookies: [bilibiliCookie('SESSDATA', nowSeconds + 7 * 24 * 60 * 60)],
    })
    const workflow = createMediaCookiesWorkflow({ browser, now: () => now })

    await workflow.scanAllSources('supported')
    workflow.clearTemporaryScan()

    await expect(workflow.exportSelectedSources(['bilibili-b-site'])).rejects.toMatchObject({
      code: 'TEMPORARY_SCAN_REQUIRED',
    })
  })

  it('exports the current Bilibili source as a Media Dock-compatible Cookie package', async () => {
    const browser = new InMemoryBrowserAdapter({
      currentUrl: 'https://www.bilibili.com/video/BV1Synthetic',
      grantedOrigins: bilibiliOrigins,
      cookies: [
        {
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
          value: 'synthetic-session-value',
        },
      ],
    })
    const workflow = createMediaCookiesWorkflow({
      browser,
      now: () => localNoon,
    })

    const passport = await workflow.inspectCurrentSource()
    expect(passport).toMatchObject({
      source: { slug: 'bilibili-b-site' },
      status: 'ready',
    })

    const receipt = await workflow.exportCurrentSource()
    expect(receipt).toMatchObject({
      sourceSlugs: ['bilibili-b-site'],
      cookieCount: 1,
    })
    expect(browser.downloads).toHaveLength(1)
    expect(browser.downloads[0]?.filename).toBe('MediaCookies_2026-07-13_12-00-00.zip')

    const archiveText = new TextDecoder().decode(
      await browser.downloads[0]?.blob.arrayBuffer(),
    )
    expect(archiveText).toContain('MediaCookies_2026-07-13_12-00-00/by-service/bilibili-b-site.cookies.txt')
    expect(archiveText).toContain('#HttpOnly_.bilibili.com\tTRUE\t/\tTRUE\t2000000000\tSESSDATA\tsynthetic-session-value')
  })

  it('defaults to Simplified Chinese without browser-language detection and persists a manual switch', async () => {
    const browser = new InMemoryBrowserAdapter()
    const workflow = createMediaCookiesWorkflow({ browser, now: () => now })

    await expect(workflow.loadPreferences()).resolves.toEqual({
      language: 'zh-CN',
      commonSourceSlugs: ['bilibili-b-site', 'youtube'],
    })

    await workflow.setLanguage('en')
    await expect(workflow.loadPreferences()).resolves.toMatchObject({ language: 'en' })
    expect(browser.storedValues()).toEqual({
      mediaCookiesPreferences: {
        language: 'en',
        commonSourceSlugs: ['bilibili-b-site', 'youtube'],
      },
    })
  })

  it('keeps existing common-source preferences when upgrading from legacy storage', async () => {
    const browser = new InMemoryBrowserAdapter({
      storage: {
        commonServiceProfile: {
          format: 'media-dock-cookie-common-profile',
          version: 1,
          saved_at: '2026-07-01T00:00:00.000Z',
          service_slugs: ['youtube', 'bilibili-b-site', 'youtube'],
          cookie_values: ['must-not-persist'],
        },
      },
    })
    const workflow = createMediaCookiesWorkflow({ browser, now: () => now })

    await expect(workflow.loadPreferences()).resolves.toMatchObject({
      language: 'zh-CN',
      commonSourceSlugs: ['youtube', 'bilibili-b-site'],
    })
  })
})

const bilibiliOrigins = [
  'https://bilibili.com/*',
  'https://*.bilibili.com/*',
  'https://bilibili.cn/*',
  'https://*.bilibili.cn/*',
  'https://biligame.com/*',
  'https://*.biligame.com/*',
]

function bilibiliCookie(name: string, expirationDate: number) {
  return {
    domain: '.bilibili.com',
    expirationDate,
    hostOnly: false,
    httpOnly: true,
    name,
    path: '/',
    sameSite: 'lax' as const,
    secure: true,
    session: false,
    storeId: '0',
    value: `synthetic-${name.toLowerCase()}`,
  }
}
