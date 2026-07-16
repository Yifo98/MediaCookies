import { describe, expect, it } from 'vitest'

import { assertBrowserExtensionArtifactPaths } from '../scripts/release-policy.mjs'

describe('browser extension release policy', () => {
  it('allows the files required by the Chrome Web Store package', () => {
    expect(() => assertBrowserExtensionArtifactPaths([
      'manifest.json',
      'popup.html',
      'workbench.html',
      'assets/popup.js',
      'assets/popup.css',
      'icons/icon128.png',
    ])).not.toThrow()
  })

  it.each([
    'launcher.exe',
    'installer.msi',
    'installer.msix',
    'bundle.appx',
    'bundle.appxbundle',
    'bundle.msixbundle',
    'native/helper.dll',
    'driver.sys',
    'Launch MediaCookies.bat',
    'launch.cmd',
    'launch.ps1',
    'launch.vbs',
    'launch.wsf',
    'legacy.com',
    'screensaver.scr',
  ])('rejects Windows executable or launcher artifact %s', (path) => {
    expect(() => assertBrowserExtensionArtifactPaths(['manifest.json', path]))
      .toThrow(`Browser extension package cannot contain Windows executable or launcher artifact: ${path}`)
  })

  it('checks forbidden extensions case-insensitively', () => {
    expect(() => assertBrowserExtensionArtifactPaths(['tools/Launcher.EXE']))
      .toThrow('Browser extension package cannot contain Windows executable or launcher artifact: tools/Launcher.EXE')
  })
})
