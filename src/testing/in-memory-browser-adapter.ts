import type {
  BrowserAdapter,
  BrowserCookie,
  BrowserDownload,
  WorkbenchScanMode,
} from '../platform/browser-adapter'
import { domainMatches } from '../../service-rules.js'

type InMemoryBrowserOptions = {
  currentUrl?: string | null
  grantedOrigins?: string[]
  cookies?: BrowserCookie[]
  grantRequests?: boolean
  storage?: Record<string, unknown>
}

export class InMemoryBrowserAdapter implements BrowserAdapter {
  readonly downloads: BrowserDownload[] = []
  readonly originRequests: string[][] = []
  readonly cookieDomainRequests: string[][] = []
  readonly workbenchOpenRequests: Array<WorkbenchScanMode | null> = []
  cookieReadCount = 0

  private currentUrl: string | null
  private readonly grantedOrigins: Set<string>
  private readonly cookies: BrowserCookie[]
  private readonly grantRequests: boolean
  private readonly storage: Record<string, unknown>

  constructor(options: InMemoryBrowserOptions = {}) {
    this.currentUrl = options.currentUrl ?? null
    this.grantedOrigins = new Set(options.grantedOrigins ?? [])
    this.cookies = structuredClone(options.cookies ?? [])
    this.grantRequests = options.grantRequests ?? true
    this.storage = structuredClone(options.storage ?? {})
  }

  async getCurrentUrl(): Promise<string | null> {
    return this.currentUrl
  }

  async containsOrigins(origins: string[]): Promise<boolean> {
    return origins.every((origin) => this.grantedOrigins.has(origin))
  }

  async requestOrigins(origins: string[]): Promise<boolean> {
    this.originRequests.push([...origins])
    if (!this.grantRequests) return false
    origins.forEach((origin) => this.grantedOrigins.add(origin))
    return true
  }

  async getAllCookies(): Promise<BrowserCookie[]> {
    this.cookieReadCount += 1
    return structuredClone(this.cookies)
  }

  async getCookiesForDomains(domains: string[]): Promise<BrowserCookie[]> {
    this.cookieReadCount += 1
    this.cookieDomainRequests.push([...domains])
    return structuredClone(this.cookies.filter((cookie) =>
      domains.some((domain) => domainMatches(cookie.domain, domain)),
    ))
  }

  async openWorkbench(scanMode?: WorkbenchScanMode): Promise<void> {
    this.workbenchOpenRequests.push(scanMode ?? null)
  }

  async download(download: BrowserDownload): Promise<void> {
    this.downloads.push(download)
  }

  async getStoredValue<T>(key: string): Promise<T | undefined> {
    return structuredClone(this.storage[key]) as T | undefined
  }

  async setStoredValue<T>(key: string, value: T): Promise<void> {
    this.storage[key] = structuredClone(value)
  }

  storedValues(): Record<string, unknown> {
    return structuredClone(this.storage)
  }
}
