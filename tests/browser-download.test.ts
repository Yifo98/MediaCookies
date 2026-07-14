import { afterEach, describe, expect, it, vi } from 'vitest'
import { createChromeBrowserAdapter } from '../src/platform/chrome-browser-adapter'

describe('browser download adapter', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('uses the page download attribute so Chromium keeps the requested ZIP filename', async () => {
    vi.useFakeTimers()
    const anchor = {
      click: vi.fn(),
      download: '',
      hidden: false,
      href: '',
      remove: vi.fn(),
    }
    const append = vi.fn()
    const chromeDownload = vi.fn().mockResolvedValue(1)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic-download')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    vi.stubGlobal('document', {
      body: { append },
      createElement: vi.fn().mockReturnValue(anchor),
    })
    vi.stubGlobal('chrome', {
      downloads: { download: chromeDownload },
    })

    const filename = 'MediaCookies_2026-07-13_19-45-30.zip'
    await createChromeBrowserAdapter().download({
      blob: new Blob(['synthetic-cookie-package'], { type: 'application/zip' }),
      filename,
    })

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(anchor).toMatchObject({
      download: filename,
      hidden: true,
      href: 'blob:synthetic-download',
    })
    expect(append).toHaveBeenCalledWith(anchor)
    expect(anchor.click).toHaveBeenCalledOnce()
    expect(anchor.remove).toHaveBeenCalledOnce()
    expect(chromeDownload).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-download')
  })
})
