import { access, readFile, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

const rootDir = process.cwd()
const packageJson = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'))
const requiredFiles = [
  'manifest.json',
  'popup.html',
  'popup.css',
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
const popupCss = await readFile(join(rootDir, 'popup.css'), 'utf8')
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

const bodyWidthMatch = popupCss.match(/body\s*{[\s\S]*?width:\s*(\d+)px/)
const bodyMaxHeightMatch = popupCss.match(/body\s*{[\s\S]*?max-height:\s*(\d+)px/)

if (!bodyWidthMatch) {
  throw new Error('popup.css must define a fixed body width for browser popup sizing')
}

const bodyWidth = Number(bodyWidthMatch[1])
if (bodyWidth < 360 || bodyWidth > 600) {
  throw new Error(`popup body width ${bodyWidth}px is outside the safe browser popup range`)
}

if (!bodyMaxHeightMatch || Number(bodyMaxHeightMatch[1]) > 600) {
  throw new Error('popup body max-height must stay at or below 600px')
}

if (/width:\s*780px/.test(popupCss)) {
  throw new Error('popup.css must not use the old 780px popup width')
}

for (const file of requiredFiles) {
  const fileStat = await stat(join(rootDir, file))
  if (!fileStat.isFile()) {
    throw new Error(`Expected file: ${file}`)
  }
}

console.log(`Validated XF MediaCookies ${manifest.version}`)
