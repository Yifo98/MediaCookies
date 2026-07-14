import type { BrowserCookie } from '../platform/browser-adapter'

export type ExpiryStatus = 'session' | 'expired' | 'soon' | 'valid'

export type NormalizedCookie = Omit<BrowserCookie, 'expirationDate'> & {
  expirationDate: number
  expiryStatus: ExpiryStatus
}

const EXPIRING_SOON_SECONDS = 24 * 60 * 60

export function normalizeBrowserCookies(
  cookies: BrowserCookie[],
  now: Date,
): NormalizedCookie[] {
  const nowSeconds = Math.floor(now.getTime() / 1000)
  return cookies.map((cookie) => {
    const expirationDate = cookie.session ? 0 : Math.floor(cookie.expirationDate ?? 0)
    return {
      ...cookie,
      expirationDate,
      expiryStatus: getExpiryStatus(expirationDate, nowSeconds),
    }
  })
}

function getExpiryStatus(expirationDate: number, nowSeconds: number): ExpiryStatus {
  if (!expirationDate) return 'session'
  if (expirationDate < nowSeconds) return 'expired'
  if (expirationDate < nowSeconds + EXPIRING_SOON_SECONDS) return 'soon'
  return 'valid'
}
