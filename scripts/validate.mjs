import { access, readFile, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

const rootDir = process.cwd()
const packageJson = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'))
const requiredFiles = [
  'manifest.json',
  'manifest.production.json',
  'popup.html',
  'workbench.html',
  'src/application/media-cookies-workflow.ts',
  'src/platform/browser-adapter.ts',
  'src/platform/chrome-browser-adapter.ts',
  'src/ui/quick-export/main.ts',
  'src/ui/workbench/main.ts',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
]

await Promise.all(requiredFiles.map((file) => access(join(rootDir, file), constants.R_OK)))

const rootManifest = JSON.parse(await readFile(join(rootDir, 'manifest.json'), 'utf8'))
const manifest = JSON.parse(await readFile(join(rootDir, 'manifest.production.json'), 'utf8'))
const permissions = new Set(manifest.permissions ?? [])
const requiredOrigins = manifest.host_permissions ?? []
const optionalOrigins = manifest.optional_host_permissions ?? []

if (manifest.manifest_version !== 3) {
  throw new Error('manifest_version must be 3')
}

if (manifest.name !== 'MediaCookies · 凭') {
  throw new Error('manifest name must use the public MediaCookies · 凭 brand')
}

if (manifest.version !== packageJson.version) {
  throw new Error(`manifest version ${manifest.version} must match package version ${packageJson.version}`)
}

for (const permission of ['activeTab', 'cookies', 'storage']) {
  if (!permissions.has(permission)) {
    throw new Error(`Missing required permission: ${permission}`)
  }
}

if (permissions.has('downloads')) {
  throw new Error('The downloads permission is unnecessary when using the page download attribute')
}

if (requiredOrigins.length > 0) {
  throw new Error('Host access must be requested on demand, not at install time')
}

if (!optionalOrigins.includes('https://*/*')) {
  throw new Error('Expected optional HTTPS host access for source-scoped requests')
}

if (manifest.options_ui?.page !== 'workbench.html' || manifest.options_ui?.open_in_tab !== true) {
  throw new Error('Expected the export workbench to open as a full browser tab')
}

if (rootManifest.action?.default_popup !== 'dist/popup.html'
  || rootManifest.options_ui?.page !== 'dist/workbench.html'
  || rootManifest.icons?.['128'] !== 'dist/icons/icon128.png') {
  throw new Error('The root development manifest must load the built extension from dist/')
}

if (rootManifest.version !== manifest.version) {
  throw new Error('Root and production manifest versions must match')
}

const normalizedRootManifest = structuredClone(rootManifest)
normalizeDistPathMap(normalizedRootManifest.icons)
normalizeDistPathMap(normalizedRootManifest.action?.default_icon)
normalizedRootManifest.action.default_popup = stripDistPrefix(
  normalizedRootManifest.action.default_popup,
)
normalizedRootManifest.options_ui.page = stripDistPrefix(
  normalizedRootManifest.options_ui.page,
)

if (JSON.stringify(normalizedRootManifest) !== JSON.stringify(manifest)) {
  throw new Error('Root and production manifests may differ only by their dist/ path prefix')
}

for (const file of requiredFiles) {
  const fileStat = await stat(join(rootDir, file))
  if (!fileStat.isFile()) throw new Error(`Expected file: ${file}`)
}

console.log(`Validated MediaCookies ${manifest.version}`)

function normalizeDistPathMap(paths) {
  Object.keys(paths ?? {}).forEach((key) => {
    paths[key] = stripDistPrefix(paths[key])
  })
}

function stripDistPrefix(path) {
  return typeof path === 'string' ? path.replace(/^dist\//, '') : path
}
