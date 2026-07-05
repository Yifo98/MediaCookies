import { access, readFile, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

const rootDir = process.cwd()
const packageJson = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'))
const requiredFiles = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup-size.js',
  'popup.js',
  'cookie-export.js',
  'service-rules.js',
  'zip.js',
  'yt-dlp-supported-sites.js',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
]

await Promise.all(requiredFiles.map((file) => access(join(rootDir, file), constants.R_OK)))

const manifest = JSON.parse(await readFile(join(rootDir, 'manifest.json'), 'utf8'))
const popupHtml = await readFile(join(rootDir, 'popup.html'), 'utf8')
const popupCss = await readFile(join(rootDir, 'popup.css'), 'utf8')
const popupSizeScript = await readFile(join(rootDir, 'popup-size.js'), 'utf8')
const permissions = new Set(manifest.permissions ?? [])
const hostPermissions = manifest.host_permissions ?? []
const optionalHostPermissions = manifest.optional_host_permissions ?? []

if (manifest.manifest_version !== 3) {
  throw new Error('manifest_version must be 3')
}

if (manifest.version !== packageJson.version) {
  throw new Error(`manifest version ${manifest.version} must match package version ${packageJson.version}`)
}

for (const permission of ['cookies', 'downloads', 'storage']) {
  if (!permissions.has(permission)) {
    throw new Error(`Missing required permission: ${permission}`)
  }
}

if (hostPermissions.some((origin) => origin === '<all_urls>')) {
  throw new Error('<all_urls> must stay optional, not a default host permission')
}

if (!optionalHostPermissions.includes('<all_urls>')) {
  throw new Error('Expected optional <all_urls> permission for explicit advanced scans')
}

const defaultWidthMatch = popupCss.match(/--popup-width:\s*(\d+)px/)
const maxWidthMatch = popupCss.match(/max-width:\s*min\((\d+)px,\s*100vw\)/)
const maxHeightMatch = popupCss.match(/max-height:\s*min\((\d+)px,\s*100vh\)/)

if (!defaultWidthMatch) {
  throw new Error('popup.css must define a default --popup-width')
}

const defaultWidth = Number(defaultWidthMatch[1])
if (defaultWidth < 360 || defaultWidth > 480) {
  throw new Error(`default popup width ${defaultWidth}px must stay in the compact safe range`)
}

if (!maxWidthMatch || Number(maxWidthMatch[1]) > 600) {
  throw new Error('popup max-width must stay at or below 600px')
}

if (!maxHeightMatch || Number(maxHeightMatch[1]) > 600) {
  throw new Error('popup max-height must stay at or below 600px')
}

if (/width:\s*780px/.test(popupCss)) {
  throw new Error('popup.css must not use the old 780px popup width')
}

if (!popupHtml.includes('<script src="./popup-size.js"></script>')) {
  throw new Error('popup.html must load popup-size.js before the stylesheet')
}

if (popupHtml.indexOf('popup-size.js') > popupHtml.indexOf('popup.css')) {
  throw new Error('popup-size.js must run before popup.css loads')
}

if (!/chrome\??\.windows\??\.getCurrent/.test(popupSizeScript)) {
  throw new Error('popup-size.js must use browser window bounds when available')
}

if (!popupSizeScript.includes('data-popup-layout')) {
  throw new Error('popup-size.js must set the adaptive layout marker')
}

for (const file of requiredFiles) {
  const fileStat = await stat(join(rootDir, file))
  if (!fileStat.isFile()) {
    throw new Error(`Expected file: ${file}`)
  }
}

console.log(`Validated XF MediaCookies ${manifest.version}`)
