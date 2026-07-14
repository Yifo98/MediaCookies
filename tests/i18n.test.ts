import { describe, expect, it } from 'vitest'
import { copyCatalog } from '../src/ui/i18n'

describe('MediaCookies copy catalog', () => {
  it('keeps the Chinese and English surfaces complete and aligned', () => {
    expect(Object.keys(copyCatalog.en).sort()).toEqual(Object.keys(copyCatalog['zh-CN']).sort())
    expect(Object.values(copyCatalog.en).every(Boolean)).toBe(true)
    expect(Object.values(copyCatalog['zh-CN']).every(Boolean)).toBe(true)
  })
})
