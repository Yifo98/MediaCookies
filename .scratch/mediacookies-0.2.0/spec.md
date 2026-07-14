# MediaCookies 0.2.0 重构规格

## Problem Statement

MediaCookies 0.1.8 把来源选择、扫描模式、常用配置、Cookie 预览、诊断和导出全部放在受限的浏览器弹窗中。Media Dock 用户必须先理解 Cookie、yt-dlp、来源列表和配置文件，才能完成“把当前网站登录状态交给 Media Dock”这一简单目标；420x600 弹窗还承载了宽表格和大量次要操作，核心动作长期位于首屏之外。

现有结构同时把 Chrome API、权限、存储、来源识别、Cookie 包生成和 DOM 渲染集中在单个入口中。当前验证只能证明文件存在、尺寸没有超限和安装包可以生成，无法证明真实扩展中的来源授权、Cookie 读取、导出状态、本地下载和 Media Dock 导入能够完成。

## Solution

MediaCookies 0.2.0 将成为面向 Media Dock 用户的“本地媒体通行证”。工具栏中的快速导出识别当前来源，给出可以导出、请先登录、可能失效或当前网页不支持的明确结论，并以一个主要动作生成 Cookie 包。完整的导出工作台只承载全来源扫描、常用来源、明细检查和自定义导出，不再提供低频的配置迁移与诊断区域。

扩展采用按来源授权、敏感值不持久化和本地 Cookie 包交接。现有 Cookie 包契约保持向后兼容，当前 Media Dock 版本无需更新即可导入。重构同时建立 TypeScript 深 module、可替换 browser adapter、纯工作流测试和真实 Chrome/Edge 验收，并交付完整的 Chrome Web Store 与 GitHub 发布素材。

## User Stories

1. As a Media Dock 用户, I want MediaCookies 默认显示简体中文, so that 我首次打开时可以直接理解。
2. As an English-speaking user, I want to switch the interface to English, so that I can use the extension without relying on browser-language detection.
3. As a returning user, I want my manually selected language to persist, so that the interface does not change unexpectedly.
4. As a Media Dock 用户, I want the extension to recognize the current source, so that I do not need to search a long source list.
5. As a Media Dock 用户, I want to see a clear media passport, so that I can understand the current source and export status at a glance.
6. As a Media Dock 用户, I want to see 可以导出 when the expected login state is present, so that I know the package is likely to work.
7. As a Media Dock 用户, I want to see 请先登录 when required login state is missing, so that I know what to do instead of seeing a technical failure.
8. As a Media Dock 用户, I want to see 可能失效 when login state is incomplete or expiring, so that I understand the risk while retaining the choice to export.
9. As a Media Dock 用户, I want to see 当前网页不支持 when no current source can be identified, so that I can return to a supported media page or open the workbench.
10. As a Media Dock 用户, I want one primary export action in quick export, so that I am not distracted by scanning modes and configuration tools.
11. As a privacy-conscious user, I want the extension to explain source access before requesting it, so that the permission has a visible purpose.
12. As a privacy-conscious user, I want access limited to the current source by default, so that installation does not grant broad browsing access.
13. As a user who refuses source access, I want a recoverable explanation, so that I can grant it later without reinstalling.
14. As an advanced user, I want a browser-wide media-site scan from quick export and an explicit all-domain option in the workbench, so that the default stays focused while uncommon sources remain discoverable.
15. As an advanced user, I want Cookie names, domains, paths, expiry and security flags in the workbench, so that I can inspect export readiness without exposing values.
16. As an advanced user, I want to select and save common sources, so that repeated exports require less setup.
17. As a Media Dock 用户, I want the extension to create a local Cookie package, so that I can import it through Media Dock's existing file picker.
18. As a Media Dock 用户, I want every Cookie package named with the product and exact local export time, so that downloads are recognizable, sortable and do not use platform-invalid punctuation.
19. As a Media Dock 用户, I want clear post-export instructions, so that I know to open Media Dock and choose 导入 Cookie ZIP.
20. As a current Media Dock user, I want new packages to remain compatible with existing releases, so that the extension upgrade does not force a desktop-app upgrade.
21. As a privacy-conscious user, I want Cookie values to exist only during the active check or export, so that refreshing or closing the interface removes sensitive state.
22. As a privacy-conscious user, I want only non-sensitive preferences persisted, so that browser storage never becomes a credential cache.
23. As a user, I want the extension to avoid telemetry and network upload, so that the local-only privacy promise remains true.
24. As a Chrome user, I want the complete source-access and export flow to work in a real extension, so that static browser previews are not mistaken for compatibility.
25. As an Edge user, I want installation, source access, export and workbench flows to remain compatible, so that I can use the same package outside Chrome.
26. As a keyboard user, I want visible focus and logical navigation, so that both interfaces are usable without a mouse.
27. As a low-vision user, I want readable contrast and stable layouts under zoom, so that the visual redesign does not reduce accessibility.
28. As a GitHub visitor, I want a clear MediaCookies brand card and README hero, so that I understand the product before installing it.
29. As a Chrome Web Store visitor, I want five real product screenshots, so that I can preview quick export and the workbench before granting access.
30. As a Chinese store visitor, I want the primary three screenshots in Chinese, so that the default experience is represented accurately.
31. As an English store visitor, I want two screenshots showing English support, so that bilingual capability is visible without duplicating the entire set.
32. As a Chrome Web Store reviewer, I want a compliant 128x128 PNG icon with correct visual weight and transparent padding, so that the listing meets image requirements.
33. As a Chrome Web Store visitor, I want small and wide promotional art that remains clear when reduced, so that the listing is recognizable across placements.
34. As a maintainer, I want source recognition, export status and package generation behind small interfaces, so that browser and UI changes do not spread business rules.
35. As a maintainer, I want Chrome calls concentrated in a browser adapter, so that tests can use an in-memory adapter and UI code stays platform-agnostic.
36. As a maintainer, I want the yt-dlp supported-site catalog isolated from workflow code, so that generated data does not dominate the navigable codebase.
37. As a maintainer, I want package compatibility tests, so that source IDs, paths and Netscape Cookie contents cannot drift unnoticed.
38. As a maintainer, I want release-asset validation, so that incorrect dimensions, alpha modes or missing artifacts fail before handoff.
39. As the publisher, I want a complete local 0.2.0 release candidate without automatic publishing, so that I retain control over commits, GitHub Releases and Chrome Web Store submission.

## Implementation Decisions

- The public product name is MediaCookies. `XF` remains a developer or publisher identity and is not part of the primary logo or interface title.
- The Chinese descriptor is “为 Media Dock 导出登录状态”; the English descriptor is “Cookie export for Media Dock.”
- Quick export and the export workbench are separate surfaces with separate information density.
- Quick export is current-source-first and exposes no Cookie table or scan-mode controls.
- The export workbench contains all-source scan, common sources, source selection, safe Cookie metadata preview and package export. It does not include a separate preferences/support section.
- The workbench names its two scan scopes “媒体站点（推荐）” and “全部 Cookie 域名”. Both use the same on-device broad-access request; the first filters to curated and yt-dlp-recognized sites, while the second keeps every accessible Cookie domain.
- Scan scope and source status are independent. Workbench sources use 可以导出, 需确认 and 请先登录; 需确认 covers unknown login markers or near-expiry Cookies without claiming that a supported source is already invalid.
- Quick export has exactly four user-facing outcomes: 可以导出, 请先登录, 可能失效 and 当前网页不支持. The English interface expresses the same meanings rather than literal word-for-word translations.
- In quick export, 可能失效 warns but does not block export. The workbench groups incomplete, unverifiable, or expiring sources under 需确认 so that source status is not confused with scan scope.
- Host access is requested on demand for the current source. Related login domains may be included when the source requires them.
- Broad host access is reserved for an explicitly initiated browser-wide scan started from quick export or the export workbench.
- Quick export provides a separate “识别整个浏览器” action. It requests broad access during that user gesture, opens the workbench in a new tab and automatically starts the recommended media-site scan; all Cookie domains remain an explicit workbench choice. The normal workbench entry never requests broad access by itself.
- Permission denial is a recoverable state and never disables the rest of the extension permanently.
- Cookie values are ephemeral. They are not written to extension storage, DOM attributes, cache files or telemetry.
- Only non-sensitive preferences such as language and common sources may persist.
- MediaCookies and Media Dock exchange data through a user-controlled local Cookie package; there is no custom protocol, Native Messaging, network upload or application-to-application connection.
- Existing source IDs, `by-service/*.cookies.txt` paths and Netscape Cookie contents remain compatible with current Media Dock releases.
- Every exported Cookie package and its root folder use `MediaCookies_YYYY-MM-DD_HH-mm-ss`, based on the user's local export time. The browser-visible download name and archive root must match. The separators are readable, sortable and valid on Windows, macOS and Linux.
- Browser downloads use the extension page's standard `download` attribute rather than `chrome.downloads.download`, because Chromium variants may replace Blob downloads with UUID filenames. The extension therefore does not request the `downloads` permission.
- New package metadata may only be additive and must not change existing meanings.
- The implementation uses TypeScript and a Vite multi-page build without React, Vue, Tailwind or another runtime UI framework.
- Source recognition, export-status evaluation and package generation are deep modules whose interfaces are the primary test surfaces.
- Chrome tabs, Cookies, permissions, downloads and storage are accessed through one browser seam with production and in-memory adapters.
- Both user interfaces call workflow interfaces and do not scatter direct `chrome.*` calls.
- The supported-site catalog is generated or maintained separately from source-recognition behavior.
- The quick-export and workbench visual system follows “Luminous Workshop / 微光工作室” colors and restrained material language while retaining an independent MediaCookies silhouette.
- The selected icon direction is the first “passage seal” candidate: an open graphite ring, play-shaped negative space and restrained lake-blue/lilac passage segments.
- MediaCookies does not reuse or redraw the Media Dock Media Berth mark. Family resemblance comes from palette, material, proportion and typography discipline.
- The icon has a transparent toolbar version optimized for 16px and 32px and a warm-ivory presentation version for larger surfaces.
- Browser icons are delivered at 16, 32, 48 and 128 pixels.
- The Chrome Web Store icon is a 128x128 PNG with a 96x96 square icon and 16 pixels of transparent padding on each side, minimal shadow, no added border and clear light/dark-background behavior.
- The shared store screenshot set contains exactly five 1280x800 images: three Chinese and two English. They are 24-bit PNG without alpha, square-cornered and full-bleed.
- Required promotional art includes 440x280; optional discovery art includes 1400x560. Promotional art avoids localized text where possible.
- GitHub assets include a 1280x640 social preview and an independent README hero. Any exact product text is typeset after image generation.
- The target version is 0.2.0 and the release package is named `mediacookies-0.2.0.zip`.
- The task produces a tested local release candidate but does not commit, push, create a GitHub Release or upload to Chrome Web Store.

## Testing Decisions

- Tests assert observable outcomes at the highest useful seam and do not couple to internal helper structure.
- The primary behavioral seam is the application workflow interface used by both quick export and the export workbench.
- The browser seam has two real adapters: Chrome in production and an in-memory adapter in tests.
- Pure module tests cover source matching, source grouping, login-state markers, export-status outcomes, expiry boundaries, deduplication, Netscape formatting, safe filenames, manifest contents and ZIP structure.
- Compatibility tests lock existing source IDs, `by-service` paths and Media Dock-readable Cookie contents.
- Workflow tests use the in-memory browser adapter to cover permission granted, permission denied, no login, complete login, expiring login, unsupported page, all-source scan, export, cleanup and persisted non-sensitive preferences.
- Automated browser runs use isolated Chrome and Edge profiles with synthetic Cookie values; they never connect to daily browser profiles by default.
- Real pages may be opened to verify current-source recognition, but real account login is only a manual fallback when synthetic data cannot reproduce a defect.
- Browser artifacts, screenshots, traces and logs never include Cookie values.
- The production `dist/` is loaded as an unpacked extension for Chrome acceptance. Static HTML with missing Chrome APIs is not acceptance evidence.
- The project-root development Manifest loads the built pages under `dist/`; the packaged production Manifest uses paths relative to the package root. Both installation entrypoints are contract-tested.
- Chrome receives the complete acceptance pass. Edge must pass loading, source access, package export and workbench smoke tests or have a reproducible platform limitation documented.
- Browser checks cover keyboard navigation, visible focus, semantic status updates, contrast, zoom, popup scrolling, workbench responsiveness, console errors and package download.
- The exported package is imported into the current Media Dock version as the final compatibility check.
- Release-asset checks validate exact pixel dimensions, PNG mode, alpha requirements, file count and legibility at reduced sizes.
- Store screenshots are captured from the real production extension and then validated as 1280x800 24-bit PNG without alpha.

## Out of Scope

- Direct browser-to-Media Dock integration, custom URL protocols and Native Messaging.
- Network upload, cloud sync, telemetry and remote diagnostics.
- Persisting Cookie values or restoring a Cookie preview after reload.
- Firefox and Safari support.
- Blocking the release on Brave, Opera or other Chromium-specific differences.
- Reusing the Media Dock Media Berth icon or modifying the Media Dock repository.
- Reintroducing profile-file migration or a diagnostic-report panel without a demonstrated user need.
- Automatic browser-language detection.
- More than simplified Chinese and English.
- Separate five-image screenshot sets for every locale; the release uses one shared five-image set.
- Automatic commit, push, tag, GitHub Release creation or Chrome Web Store submission.

## Further Notes

- The current baseline is MediaCookies 0.1.8 on Manifest V3 with no runtime framework and a local-only privacy promise.
- The current package-validation, build and ZIP scripts are evidence of the existing contract but are not sufficient browser tests.
- The previous adaptive-popup experiment was reverted; the new design solves the problem by separating surfaces rather than widening the popup.
- Chrome's official image guidance is the source of truth for icon, screenshot and promotional-image constraints.
- The project glossary and ADRs created during the design interview are normative for implementation terminology and irreversible decisions.
