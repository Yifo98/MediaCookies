import { extname } from 'node:path'

const forbiddenWindowsArtifactExtensions = new Set([
  '.appx',
  '.appxbundle',
  '.bat',
  '.cmd',
  '.com',
  '.dll',
  '.exe',
  '.msi',
  '.msix',
  '.msixbundle',
  '.ps1',
  '.scr',
  '.sys',
  '.vbs',
  '.wsf',
])

export function assertBrowserExtensionArtifactPaths(paths) {
  for (const path of paths) {
    if (forbiddenWindowsArtifactExtensions.has(extname(path).toLowerCase())) {
      throw new Error(
        `Browser extension package cannot contain Windows executable or launcher artifact: ${path}`,
      )
    }
  }
}
