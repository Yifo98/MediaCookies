import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { buildZip } from '../dist/zip.js'

const rootDir = process.cwd()
const distDir = join(rootDir, 'dist')
const releaseDir = join(rootDir, 'release')
const manifest = JSON.parse(await readFile(join(distDir, 'manifest.json'), 'utf8'))
const zipPath = join(releaseDir, `media-dock-cookie-exporter-${manifest.version}.zip`)

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath))
    } else if (entry.isFile()) {
      files.push(absolutePath)
    }
  }

  return files
}

const sourceFiles = (await collectFiles(distDir)).sort((left, right) => left.localeCompare(right))
const zipFiles = await Promise.all(
  sourceFiles.map(async (absolutePath) => ({
    path: relative(distDir, absolutePath),
    content: new Uint8Array(await readFile(absolutePath)),
  })),
)

await mkdir(releaseDir, { recursive: true })
const blob = buildZip(zipFiles)
await writeFile(zipPath, new Uint8Array(await blob.arrayBuffer()))

console.log(`Packaged ${zipPath}`)
