# MediaCookies · 凭 QIDU Refresh Audit

Date: 2026-07-15
Repository: `Yifo98/MediaCookies`
Base: `18c2af03f7ffb25fd1093f6d8d4cec8433429eda` (`main`, `v0.2.0`)
Working branch: `brand/qidu-refresh`

## Result

The QIDU refresh is implemented as a presentation-layer update. The extension now uses the public lockup `MediaCookies · 凭`, the signature `A QIDU Utility`, and the boundary principle `凭以通行，不越边界。` / `Pass by permission, never beyond the boundary.`

The supplied execution package was audited before implementation. Its referenced `Logo/生产草案/` directory was absent, so the direction board was initially treated as reference-only. The user then explicitly authorized producing a new logo from that board. The selected ImageGen master was converted into separate presentation and small-toolbar derivatives by a deterministic local script; the direction board itself is not cropped or shipped as production artwork.

## Implemented file map

| Area | Final change |
| --- | --- |
| `docs/brand/assets/source/` | Added the selected raster master and transparent production master. |
| `scripts/generate-qidu-icons.py` | Added deterministic generation for presentation and toolbar variants. |
| `icons/`, `icons/toolbar/`, `icons/presentation/` | Rebuilt 16/32/48/128px extension and store derivatives. |
| `popup.html`, `src/ui/base.css` | Refined the existing quick-export flow with the QIDU lockup, hierarchy, cards, and boundary copy. |
| `workbench.html`, `src/ui/workbench/styles.css` | Refined the existing export workbench without adding routes or changing its workflow. |
| `src/ui/i18n.ts` | Added bilingual brand copy while preserving manual Chinese/English switching and Simplified Chinese as default. |
| `manifest.json`, `manifest.production.json` | Updated visible product naming only; the permission set and entry points are unchanged. |
| `README.md`, `docs/brand/*` | Updated the public brand story, icon rules, proof sheet, and publishing guidance. |
| `docs/store/*`, `docs/github/*` | Regenerated five Chrome Web Store screenshots, promo tiles, README hero, and GitHub social preview. |
| `docs/video/qidu-demo/` | Added the 40-second authored composition, 28-second accelerated delivery, real product captures, source ledger, and QA snapshots. |
| Execution-package `OUTPUT/` | Delivered eight 1920×1080 screenshots, the final MP4, contact sheet, report, and local release candidate. |

## Preserved functional boundary

The following implementation areas were intentionally not changed:

- `src/application/media-cookies-workflow.ts`
- `src/domain/*`
- `src/platform/*`
- `cookie-export.js`
- `zip.js`
- `service-rules.js`

Therefore the Cookie package format, timestamp filename contract, source-recognition rules, readiness states, scanning modes, and Media Dock compatibility remain unchanged. The production manifest still uses only `activeTab`, `cookies`, and `storage`; broader host access remains optional and requested on demand.

No password export, Cookie-value display, telemetry, analytics, advertisements, remote code, or network upload was added.

## Real-browser acceptance

The built production extension was loaded in an isolated Opera Neon profile at `/tmp/mediacookies-qidu-opera-cdp-20260715`.

- Production extension ID: `kmcambkejdnambgchondfhhalcgpdkac`
- Quick export opened from the actual extension action.
- The real “打开导出工作台” action opened the workbench.
- Manual Simplified Chinese / English switching persisted.
- Active permissions remained `activeTab`, `cookies`, and `storage`; broad host access was not granted.
- Directly opening the action page cannot synthesize Chromium's `activeTab` grant, so the unsupported-state result in that diagnostic path is expected platform behavior rather than an extension regression.

All captures use synthetic metadata and public or repository-owned imagery. No Cookie values, credentials, private URLs, notifications, or personal files appear.

## Validation

Final `npm run check` passed on 2026-07-15:

- manifest and package validation passed;
- four icon sets, five store screenshots, and four publishing assets passed asset validation;
- 5 test files / 28 tests passed;
- TypeScript typecheck passed;
- production build passed;
- `release/mediacookies-0.2.0.zip` was created successfully.

The video composition also passed its dedicated QA with zero lint, runtime, layout, motion, or contrast findings. Its 40-second authored master is accelerated at 1.4286× into a 28.000-second final delivery; the final MP4 remains 1920×1080 at 30fps with H.264 video and AAC audio.

## Publication gate

This delivery is committed and pushed only to `brand/qidu-refresh` for GitHub review. It is not merged into `main`. No GitHub Release, Chrome Web Store submission, repository-visibility change, or X post was performed. Human review of the final screenshots, video, store listing, and trademark proximity remains required before any publication step.
