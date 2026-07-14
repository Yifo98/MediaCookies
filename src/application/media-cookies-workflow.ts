import {
  buildCookieExportFromScan,
  buildCookiePreviewScan,
} from '../../cookie-export.js'
import {
  findCurrentSourceRule,
} from '../../service-rules.js'
import { buildZip } from '../../zip.js'
import { normalizeBrowserCookies } from '../domain/cookie-normalization'
import { inspectSource, type SourceRule } from '../domain/source-inspection'
import {
  DEFAULT_PREFERENCES,
  LEGACY_COMMON_PROFILE_KEY,
  PREFERENCES_KEY,
  normalizeSourceSlugs,
  parseLegacyCommonSourceSlugs,
  parsePreferences,
  type Language,
  type UserPreferences,
} from '../domain/user-preferences'
import type { BrowserAdapter, WorkbenchScanMode } from '../platform/browser-adapter'

type ExportStatus = 'ready' | 'sign-in' | 'at-risk' | 'unsupported'

type SourceSummary = {
  slug: string
  title: string
}

export type MediaPassport = {
  source: SourceSummary | null
  status: ExportStatus
  access: 'granted' | 'required'
}

export type ExportReceipt = {
  filename: string
  sourceSlugs: string[]
  cookieCount: number
}

export type WorkbenchSnapshot = {
  generatedAt: string
  scanMode: 'supported' | 'all'
  ignoredCookieCount: number
  sources: Array<{
    slug: string
    title: string
    cookieCount: number
    status: Exclude<ExportStatus, 'unsupported'>
    expiringSoonCount: number
    domains: string[]
  }>
  previewRows: Array<{
    domain: string
    name: string
    path: string
    expiry: string
    status: string
    secure: boolean
    httpOnly: boolean
    services: string[]
  }>
}

type WorkflowOptions = {
  browser: BrowserAdapter
  now?: () => Date
}

type CookieBundle = ReturnType<typeof buildCookieExportFromScan>

export class MediaCookiesWorkflowError extends Error {
  readonly recoverable: boolean

  constructor(
    readonly code:
      | 'CURRENT_SOURCE_UNSUPPORTED'
      | 'CURRENT_SOURCE_SIGN_IN_REQUIRED'
      | 'SOURCE_ACCESS_DENIED'
      | 'ALL_SOURCE_ACCESS_DENIED'
      | 'TEMPORARY_SCAN_REQUIRED',
    recoverable = true,
  ) {
    super(code)
    this.name = 'MediaCookiesWorkflowError'
    this.recoverable = recoverable
  }
}

export function createMediaCookiesWorkflow({
  browser,
  now = () => new Date(),
}: WorkflowOptions) {
  let temporaryScan: ReturnType<typeof buildCookiePreviewScan> | null = null

  async function inspectCurrentSource(): Promise<MediaPassport> {
    const currentUrl = await browser.getCurrentUrl()
    const rule = currentUrl ? findRuleForUrl(currentUrl) : null
    if (!rule) {
      return { source: null, status: 'unsupported', access: 'granted' }
    }

    const access = await browser.containsOrigins(rule.origins)
    if (!access) {
      return {
        source: { slug: rule.slug, title: rule.title },
        status: 'sign-in',
        access: 'required',
      }
    }

    const inspection = inspectSource(
      rule as SourceRule,
      await browser.getCookiesForDomains(rule.domains),
      now(),
    )
    return {
      source: { slug: rule.slug, title: rule.title },
      status: inspection.status,
      access: 'granted',
    }
  }

  async function exportCurrentSource(): Promise<ExportReceipt> {
    const currentUrl = await browser.getCurrentUrl()
    const rule = currentUrl ? findRuleForUrl(currentUrl) : null
    if (!rule) throw new MediaCookiesWorkflowError('CURRENT_SOURCE_UNSUPPORTED')

    const hasAccess = await browser.containsOrigins(rule.origins)
    if (!hasAccess && !await browser.requestOrigins(rule.origins)) {
      throw new MediaCookiesWorkflowError('SOURCE_ACCESS_DENIED')
    }

    const exportedAt = now()
    const cookies = await browser.getCookiesForDomains(rule.domains)
    const inspection = inspectSource(rule as SourceRule, cookies, exportedAt)
    if (inspection.status === 'sign-in') {
      throw new MediaCookiesWorkflowError('CURRENT_SOURCE_SIGN_IN_REQUIRED')
    }
    const bundle = buildBundle(cookies, rule.slug, exportedAt)
    return downloadCookieBundle(bundle, exportedAt)
  }

  async function scanAllSources(mode: 'supported' | 'all'): Promise<WorkbenchSnapshot> {
    const broadOrigins = ['https://*/*']
    const hasAccess = await browser.containsOrigins(broadOrigins)
    if (!hasAccess && !await browser.requestOrigins(broadOrigins)) {
      throw new MediaCookiesWorkflowError('ALL_SOURCE_ACCESS_DENIED')
    }

    const generatedAt = now()
    const cookies = normalizeBrowserCookies(await browser.getAllCookies(), generatedAt)
    const scan = buildCookiePreviewScan(cookies, mode, generatedAt.toISOString())
    temporaryScan = scan
    if (scan.rules.length === 0) {
      return {
        generatedAt: scan.generatedAt,
        scanMode: mode,
        ignoredCookieCount: scan.ignoredCookieCount,
        sources: [],
        previewRows: [],
      }
    }

    const bundle = buildCookieExportFromScan(scan, scan.rules.map((rule: { slug: string }) => rule.slug))
    return {
      generatedAt: bundle.generatedAt,
      scanMode: mode,
      ignoredCookieCount: scan.ignoredCookieCount,
      sources: bundle.serviceSummaries.map((source: {
        slug: string
        title: string
        cookieCount: number
        loginStatus: string
        expiringSoonCount: number
        domains: string[]
      }) => ({
        slug: source.slug,
        title: source.title,
        cookieCount: source.cookieCount,
        status: toWorkbenchStatus(source.loginStatus, source.expiringSoonCount),
        expiringSoonCount: source.expiringSoonCount,
        domains: source.domains,
      })),
      previewRows: bundle.previewRows,
    }
  }

  async function openWorkbench(scanMode?: WorkbenchScanMode): Promise<void> {
    if (scanMode) {
      const broadOrigins = ['https://*/*']
      const hasAccess = await browser.containsOrigins(broadOrigins)
      if (!hasAccess && !await browser.requestOrigins(broadOrigins)) {
        throw new MediaCookiesWorkflowError('ALL_SOURCE_ACCESS_DENIED')
      }
    }
    await browser.openWorkbench(scanMode)
  }

  async function exportSelectedSources(sourceSlugs: string[]): Promise<ExportReceipt> {
    if (!temporaryScan) {
      throw new MediaCookiesWorkflowError('TEMPORARY_SCAN_REQUIRED')
    }

    const exportedAt = now()
    const bundle = buildCookieExportFromScan(temporaryScan, sourceSlugs)
    const receipt = await downloadCookieBundle(bundle, exportedAt)
    temporaryScan = null
    return receipt
  }

  async function downloadCookieBundle(
    bundle: CookieBundle,
    modifiedAt: Date,
  ): Promise<ExportReceipt> {
    const folderName = `MediaCookies_${formatCookiePackageTimestamp(modifiedAt)}`
    const files = [...bundle.files.entries()].map(([path, content]: [string, string]) => ({
      path: `${folderName}/${path}`,
      content,
    }))
    const filename = `${folderName}.zip`
    await browser.download({ blob: buildZip(files, modifiedAt), filename })
    return {
      filename,
      sourceSlugs: bundle.rules.map((rule: { slug: string }) => rule.slug),
      cookieCount: bundle.cookies.length,
    }
  }

  function clearTemporaryScan(): void {
    temporaryScan = null
  }

  async function loadPreferences(): Promise<UserPreferences> {
    const stored = await browser.getStoredValue<unknown>(PREFERENCES_KEY)
    if (stored !== undefined) return parsePreferences(stored)

    const legacySourceSlugs = parseLegacyCommonSourceSlugs(
      await browser.getStoredValue<unknown>(LEGACY_COMMON_PROFILE_KEY),
    )
    return legacySourceSlugs.length > 0
      ? { ...DEFAULT_PREFERENCES, commonSourceSlugs: legacySourceSlugs }
      : structuredClone(DEFAULT_PREFERENCES)
  }

  async function setLanguage(language: Language): Promise<void> {
    const preferences = await loadPreferences()
    await browser.setStoredValue(PREFERENCES_KEY, { ...preferences, language })
  }

  async function saveCommonSources(sourceSlugs: string[]): Promise<string[]> {
    const normalized = normalizeSourceSlugs(sourceSlugs)
    const preferences = await loadPreferences()
    await browser.setStoredValue(PREFERENCES_KEY, {
      ...preferences,
      commonSourceSlugs: normalized,
    })
    return normalized
  }

  return {
    inspectCurrentSource,
    exportCurrentSource,
    scanAllSources,
    openWorkbench,
    exportSelectedSources,
    clearTemporaryScan,
    loadPreferences,
    setLanguage,
    saveCommonSources,
  }
}

function findRuleForUrl(url: string) {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return null
  }
  return findCurrentSourceRule(hostname)
}

function buildBundle(cookies: unknown[], sourceSlug: string, generatedAt: Date) {
  const scan = buildCookiePreviewScan(
    normalizeBrowserCookies(cookies as Parameters<typeof normalizeBrowserCookies>[0], generatedAt),
    'supported',
    generatedAt.toISOString(),
  )
  return buildCookieExportFromScan(scan, [sourceSlug])
}

function toWorkbenchStatus(
  loginStatus: string,
  expiringSoonCount: number,
): Exclude<ExportStatus, 'unsupported'> {
  if (loginStatus === 'strong' && expiringSoonCount === 0) return 'ready'
  if (loginStatus === 'missing') return 'sign-in'
  return 'at-risk'
}

function formatCookiePackageTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`,
  ].join('_')
}
