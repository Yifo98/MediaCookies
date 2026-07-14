import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import viteConfig from '../vite.config'

describe('extension installation entrypoints', () => {
  it('keeps both root development loading and packaged loading on built pages', async () => {
    const rootManifest = JSON.parse(await readFile('manifest.json', 'utf8'))
    const productionManifest = JSON.parse(await readFile('manifest.production.json', 'utf8'))

    expect(rootManifest.action.default_popup).toBe('dist/popup.html')
    expect(rootManifest.options_ui.page).toBe('dist/workbench.html')
    expect(rootManifest.icons['128']).toBe('dist/icons/icon128.png')

    expect(productionManifest.action.default_popup).toBe('popup.html')
    expect(productionManifest.options_ui.page).toBe('workbench.html')
    expect(productionManifest.icons['128']).toBe('icons/icon128.png')
    expect(viteConfig.base).toBe('./')
  })
})
