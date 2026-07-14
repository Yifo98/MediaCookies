export const PREFERENCES_KEY = 'mediaCookiesPreferences'
export const LEGACY_COMMON_PROFILE_KEY = 'commonServiceProfile'

export type Language = 'zh-CN' | 'en'

export type UserPreferences = {
  language: Language
  commonSourceSlugs: string[]
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'zh-CN',
  commonSourceSlugs: ['bilibili-b-site', 'youtube'],
}

export function parsePreferences(value: unknown): UserPreferences {
  if (!isRecord(value)) return structuredClone(DEFAULT_PREFERENCES)
  return {
    language: value.language === 'en' ? 'en' : 'zh-CN',
    commonSourceSlugs: normalizeSourceSlugs(value.commonSourceSlugs).length > 0
      ? normalizeSourceSlugs(value.commonSourceSlugs)
      : [...DEFAULT_PREFERENCES.commonSourceSlugs],
  }
}

export function parseLegacyCommonSourceSlugs(value: unknown): string[] {
  if (!isRecord(value)) return []
  return normalizeSourceSlugs(value.serviceSlugs ?? value.service_slugs)
}

export function normalizeSourceSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
