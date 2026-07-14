export type BrowserCookie = {
  domain: string
  expirationDate?: number
  hostOnly: boolean
  httpOnly: boolean
  name: string
  path: string
  sameSite: 'no_restriction' | 'lax' | 'strict' | 'unspecified'
  secure: boolean
  session: boolean
  storeId: string
  value: string
}

export type BrowserDownload = {
  blob: Blob
  filename: string
}

export type WorkbenchScanMode = 'supported' | 'all'

export interface BrowserAdapter {
  getCurrentUrl(): Promise<string | null>
  containsOrigins(origins: string[]): Promise<boolean>
  requestOrigins(origins: string[]): Promise<boolean>
  getAllCookies(): Promise<BrowserCookie[]>
  getCookiesForDomains(domains: string[]): Promise<BrowserCookie[]>
  openWorkbench(scanMode?: WorkbenchScanMode): Promise<void>
  download(download: BrowserDownload): Promise<void>
  getStoredValue<T>(key: string): Promise<T | undefined>
  setStoredValue<T>(key: string, value: T): Promise<void>
}
