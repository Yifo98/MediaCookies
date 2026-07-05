# XF MediaCookies

Browser extension for exporting selected site cookies as Media Dock compatible ZIP packages.

## Install

- Chrome Web Store: [XF MediaCookies](https://chromewebstore.google.com/detail/xf-mediacookies/pkpnjlcfhkgiapclmidlhfgjklhifcek)
- Other Chromium-based browsers can also open the same Chrome Web Store link when their extension store flow supports Chrome extensions.
- GitHub Releases: [download the ZIP package](https://github.com/Yifo98/MediaCookies/releases/latest), then load the unpacked extension from the generated `dist/` folder when developing locally.

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
