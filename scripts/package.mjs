import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { buildZip } from '../zip.js'
import { assertBrowserExtensionArtifactPaths } from './release-policy.mjs'

const rootDir = process.cwd()
const distDir = join(rootDir, 'dist')
const releaseDir = join(rootDir, 'release')
const manifest = JSON.parse(await readFile(join(distDir, 'manifest.json'), 'utf8'))
const zipPath = join(releaseDir, `mediacookies-${manifest.version}.zip`)

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

const sourceEntries = (await collectFiles(distDir))
  .sort((left, right) => left.localeCompare(right))
  .map((absolutePath) => ({
    absolutePath,
    path: relative(distDir, absolutePath),
  }))
assertBrowserExtensionArtifactPaths(sourceEntries.map(({ path }) => path))

const zipFiles = await Promise.all(
  sourceEntries.map(async ({ absolutePath, path }) => ({
    path,
    content: new Uint8Array(await readFile(absolutePath)),
  })),
)

await mkdir(releaseDir, { recursive: true })
const blob = buildZip(zipFiles)
await writeFile(zipPath, new Uint8Array(await blob.arrayBuffer()))

console.log(`Packaged ${zipPath}`)
