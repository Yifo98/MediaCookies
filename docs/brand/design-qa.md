# MediaCookies · 凭 Design QA

Date: 2026-07-15
Final result: **passed**

## Visual comparison

The supplied `Logo/Logo-设计方向板.png` and the production Opera Neon popup were placed side by side in one comparison board before final approval:

- Comparison board: `output/brand-qa/reference-vs-popup.png`
- Final Opera popup: `output/brand-qa/popup-en-isolated-fixed.png`
- Final workbench: `output/brand-qa/workbench-en-isolated.png`
- Final encoded-video contact sheet: `output/brand-qa/video-final/contact-sheet.jpg`

The implementation preserves the board's open violet passage, cyan granted slice, media-play center, warm-white material, ink typography, and restrained QIDU attribution. It adapts those traits to the existing popup and workbench rather than replacing the mature product flow.

## Findings

### P0

None.

### P1 — resolved

- The first English popup capture exceeded the fixed Chromium extension-action height. Copy density and vertical spacing were tightened until the real popup fit the 600px platform boundary.
- Early publishing renders retained stale source captures. The source capture set was replaced and all dependent store/GitHub assets were regenerated.
- The first workbench store capture reduced interface legibility. The real workbench capture was reframed and the store composition rebalanced.
- The first video permission scene reused the ready-state capture. It now uses the real Opera Neon state containing the on-demand “授权并扫描媒体站点” action.
- The first scan-scope scene used editorial comparison cards. It now shows the real production workbench and its actual two scan-range controls.
- The Media Dock handoff scene now visibly identifies its import state as synthetic; it is not presented as evidence of a completed real import test.
- The first delivery held every beat for five seconds and felt slow. The final MP4 preserves all eight beats but runs at 1.4286× for an exactly 28.000-second delivery.
- The social publishing pass now renders matched Simplified Chinese and English editions from one declared language variable. Both editions preserve the same scene order, timing, privacy claims, and real-product evidence; localized interface captures are used where available, and unavailable states are never fabricated.
- The first English render placed its duration label over a lighter glow and missed WCAG AA contrast. The label now uses the declared ink color; both editions pass 56/56 sampled text checks.
- Early video QA reported contrast and layout findings. The affected typography and scene layout were corrected; final HyperFrames checks return zero runtime, layout, motion, or contrast errors, with one accepted maintainability warning for the single-file bilingual composition.

### P2 — accepted

- The toolbar derivative intentionally omits the long presentation rays at 16px and 32px. This is a legibility adaptation, not a different mark.
- The store workbench screenshot is scaled to show the full workflow in a 1280×800 frame. It remains a real production capture and the primary controls are still readable.
- Media Dock appears only as a public/repository-owned handoff reference; the Media Dock repository was not modified.

## Accessibility and privacy checks

- Visible UI text has passed contrast QA.
- Focus styling and existing keyboard semantics remain intact.
- Chinese is the default language; English is selected manually and persists.
- Cookie values never appear in UI, screenshots, diagnostics, or video.
- Synthetic metadata is used wherever a state needs demonstration.
- Final encoded contact sheets were inspected for both `zh-CN` and `en` editions.
