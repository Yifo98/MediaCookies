import { cp, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const rootDir = process.cwd()
const distDir = join(rootDir, 'dist')
const files = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup-size.js',
  'popup.js',
  'cookie-export.js',
  'service-rules.js',
  'zip.js',
  'yt-dlp-supported-sites.js',
  'icons',
]

await rm(distDir, { recursive: true, force: true })
await mkdir(distDir, { recursive: true })

await Promise.all(
  files.map((file) => cp(join(rootDir, file), join(distDir, file), { recursive: true })),
)

console.log(`Built extension files in ${distDir}`)
