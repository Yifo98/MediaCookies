import { domainMatches } from '../../service-rules.js'
import type { BrowserCookie } from '../platform/browser-adapter'
import { normalizeBrowserCookies } from './cookie-normalization'

export type SourceRule = {
  slug: string
  title: string
  domains: string[]
  origins: string[]
  strongLoginMarkers: string[]
  weakLoginMarkers: string[]
  strongMarkerMode?: 'all' | 'any'
}

export type SourceInspection = {
  status: 'ready' | 'sign-in' | 'at-risk'
  cookieCount: number
  expiredCount: number
  expiringSoonCount: number
  presentStrongMarkers: string[]
  presentWeakMarkers: string[]
  missingStrongMarkers: string[]
}

export function inspectSource(
  rule: SourceRule,
  cookies: BrowserCookie[],
  now: Date,
): SourceInspection {
  const sourceCookies = normalizeBrowserCookies(
    cookies.filter((cookie) =>
      rule.domains.some((domain) => domainMatches(cookie.domain, domain)),
    ),
    now,
  )
  const activeCookies = sourceCookies.filter((cookie) => cookie.expiryStatus !== 'expired')
  const activeNames = new Set(activeCookies.map((cookie) => cookie.name.toLowerCase()))
  const presentStrongMarkers = rule.strongLoginMarkers.filter((marker) =>
    activeNames.has(marker.toLowerCase()),
  )
  const presentWeakMarkers = rule.weakLoginMarkers.filter((marker) =>
    activeNames.has(marker.toLowerCase()),
  )
  const missingStrongMarkers = rule.strongLoginMarkers.filter((marker) =>
    !activeNames.has(marker.toLowerCase()),
  )
  const expiringSoonCount = activeCookies.filter((cookie) => cookie.expiryStatus === 'soon').length

  return {
    status: getExportStatus({
      rule,
      activeCookieCount: activeCookies.length,
      presentStrongMarkers,
      presentWeakMarkers,
      missingStrongMarkers,
      expiringSoonCount,
    }),
    cookieCount: sourceCookies.length,
    expiredCount: sourceCookies.length - activeCookies.length,
    expiringSoonCount,
    presentStrongMarkers,
    presentWeakMarkers,
    missingStrongMarkers,
  }
}

function getExportStatus({
  rule,
  activeCookieCount,
  presentStrongMarkers,
  presentWeakMarkers,
  missingStrongMarkers,
  expiringSoonCount,
}: {
  rule: SourceRule
  activeCookieCount: number
  presentStrongMarkers: string[]
  presentWeakMarkers: string[]
  missingStrongMarkers: string[]
  expiringSoonCount: number
}): SourceInspection['status'] {
  if (activeCookieCount === 0) return 'sign-in'
  if (rule.strongLoginMarkers.length === 0 && rule.weakLoginMarkers.length === 0) {
    return 'at-risk'
  }

  const hasStrongLogin = rule.strongMarkerMode === 'all'
    ? missingStrongMarkers.length === 0
    : presentStrongMarkers.length > 0
  if (hasStrongLogin) return expiringSoonCount > 0 ? 'at-risk' : 'ready'
  if (presentStrongMarkers.length > 0 || presentWeakMarkers.length > 0) return 'at-risk'
  return 'sign-in'
}
