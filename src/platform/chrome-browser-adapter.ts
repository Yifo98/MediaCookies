import type {
  BrowserAdapter,
  BrowserCookie,
  BrowserDownload,
  WorkbenchScanMode,
} from './browser-adapter'

export function createChromeBrowserAdapter(): BrowserAdapter {
  return {
    async getCurrentUrl() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      return tab?.url ?? null
    },

    async containsOrigins(origins) {
      return chrome.permissions.contains({ origins })
    },

    async requestOrigins(origins) {
      return chrome.permissions.request({ origins })
    },

    async getAllCookies() {
      const cookies = await chrome.cookies.getAll({})
      return cookies.map(toBrowserCookie)
    },

    async getCookiesForDomains(domains) {
      const cookieGroups = await Promise.all(
        [...new Set(domains)].map((domain) => chrome.cookies.getAll({ domain })),
      )
      const cookiesByKey = new Map<string, BrowserCookie>()
      cookieGroups.flat().map(toBrowserCookie).forEach((cookie) => {
        cookiesByKey.set(cookieKey(cookie), cookie)
      })
      return [...cookiesByKey.values()]
    },

    async openWorkbench(scanMode?: WorkbenchScanMode) {
      const page = chrome.runtime.getManifest().options_ui?.page ?? 'workbench.html'
      const query = scanMode ? `?scan=${encodeURIComponent(scanMode)}` : ''
      await chrome.tabs.create({ url: chrome.runtime.getURL(`${page}${query}`) })
    },

    async download({ blob, filename }: BrowserDownload) {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.hidden = true
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1_000)
    },

    async getStoredValue<T>(key: string) {
      const values = await chrome.storage.local.get([key])
      return values[key] as T | undefined
    },

    async setStoredValue<T>(key: string, value: T) {
      await chrome.storage.local.set({ [key]: value })
    },
  }
}

function cookieKey(cookie: BrowserCookie): string {
  return [cookie.storeId, cookie.domain, cookie.path, cookie.name].join('\t')
}

function toBrowserCookie(cookie: chrome.cookies.Cookie): BrowserCookie {
  return {
    domain: cookie.domain,
    expirationDate: cookie.expirationDate,
    hostOnly: cookie.hostOnly,
    httpOnly: cookie.httpOnly,
    name: cookie.name,
    path: cookie.path,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    session: cookie.session,
    storeId: cookie.storeId,
    value: cookie.value,
  }
}
