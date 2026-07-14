import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { readPngMetadata } from './png-utils.mjs'

const rootDir = process.cwd()

const icons = [
  ['icons/icon16.png', 16],
  ['icons/icon32.png', 32],
  ['icons/icon48.png', 48],
  ['icons/icon128.png', 128],
]

for (const [path, size] of icons) {
  const metadata = await readPngMetadata(join(rootDir, path))
  assertDimensions(metadata, size, size)
  if (metadata.bitDepth !== 8 || metadata.colorType !== 6 || !metadata.hasAlpha) {
    throw new Error(`${path} must be an 8-bit RGBA PNG`)
  }
}

const storeIcon = await readPngMetadata(join(rootDir, 'icons/icon128.png'))
if (!storeIcon.alphaBounds
  || storeIcon.alphaBounds.minX < 16
  || storeIcon.alphaBounds.minY < 16
  || storeIcon.alphaBounds.maxX > 111
  || storeIcon.alphaBounds.maxY > 111) {
  throw new Error(`icons/icon128.png must keep the artwork inside the 96x96 store zone; got ${JSON.stringify(storeIcon.alphaBounds)}`)
}

const screenshotDir = join(rootDir, 'docs/store/assets/screenshots')
const screenshotNames = (await readdir(screenshotDir))
  .filter((name) => name.endsWith('.png'))
  .sort()
if (screenshotNames.length !== 5) {
  throw new Error(`Expected exactly 5 store screenshots, found ${screenshotNames.length}`)
}
if (screenshotNames.filter((name) => name.startsWith('zh-')).length !== 3
  || screenshotNames.filter((name) => name.startsWith('en-')).length !== 2) {
  throw new Error('Store screenshots must contain 3 zh-* files and 2 en-* files')
}
for (const name of screenshotNames) {
  await validateOpaqueRgbPng(join(screenshotDir, name), 1280, 800)
}

const fixedAssets = [
  ['docs/store/assets/promo/small-promo-440x280.png', 440, 280],
  ['docs/store/assets/promo/marquee-promo-1400x560.png', 1400, 560],
  ['docs/github/social-preview-1280x640.png', 1280, 640],
  ['docs/github/readme-hero-1600x480.png', 1600, 480],
]
for (const [path, width, height] of fixedAssets) {
  await validateOpaqueRgbPng(join(rootDir, path), width, height)
}

console.log(`Validated ${icons.length} icons, ${screenshotNames.length} screenshots and ${fixedAssets.length} publishing assets`)

async function validateOpaqueRgbPng(path, width, height) {
  const metadata = await readPngMetadata(path)
  assertDimensions(metadata, width, height)
  if (metadata.bitDepth !== 8 || metadata.colorType !== 2 || metadata.hasAlpha) {
    throw new Error(`${basename(path)} must be a 24-bit RGB PNG without alpha`)
  }
}

function assertDimensions(metadata, width, height) {
  if (metadata.width !== width || metadata.height !== height) {
    throw new Error(`${metadata.path} must be ${width}x${height}; got ${metadata.width}x${metadata.height}`)
  }
}
