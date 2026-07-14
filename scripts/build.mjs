import { cp, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const rootDir = process.cwd()
const distDir = join(rootDir, 'dist')

const iconNames = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png']
const distIconsDir = join(distDir, 'icons')

await mkdir(distIconsDir, { recursive: true })
await Promise.all([
  cp(join(rootDir, 'manifest.production.json'), join(distDir, 'manifest.json')),
  ...iconNames.map((iconName) => cp(
    join(rootDir, 'icons', iconName),
    join(distIconsDir, iconName),
  )),
])

console.log(`Completed extension build in ${distDir}`)
