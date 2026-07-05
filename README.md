# XF MediaCookies

Browser extension for exporting selected site cookies as Media Dock compatible ZIP packages.

## Commands

```bash
npm run validate
npm run build
npm run package
npm run check
```

`npm run package` writes the uploadable extension package to `release/media-dock-cookie-exporter-<version>.zip`.

## Privacy Boundary

- Reads browser cookies only after the user opens the extension and grants browser permissions.
- Exports only user-selected sources.
- Downloads the ZIP locally through `chrome.downloads`.
- Does not send cookies, passwords, tokens, or diagnostics to any network endpoint.
- The preview table and export manifest omit cookie values; exported `cookies.txt` files do contain sensitive cookie values and must stay local.

## Media Dock Integration

Media Dock can consume this project during packaging with:

```bash
MEDIA_DOCK_COOKIE_EXTENSION_PROJECT_DIR=/path/to/MediaCookies npm run dist:mac
```

The packaged Media Dock share ZIP includes both the extension ZIP and the unpacked `dist/` folder.
