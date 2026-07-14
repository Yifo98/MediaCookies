# 08 — Verify the local release candidate

**What to build:** A tested local MediaCookies 0.2.0 release candidate with evidence from Chrome, Edge, Media Dock import, visual assets and final diff review, without publishing it.

**Blocked by:** 02 — Deliver current-source quick export; 03 — Deliver the export workbench; 04 — Add preferences and languages; 05 — Apply the Luminous Workshop visual system; 06 — Build release and asset validation; 07 — Produce store and GitHub assets.

**Status:** completed

- [x] Chrome passes the complete isolated-profile acceptance flow with synthetic Cookie values.
- [x] Edge passes loading, source access, export and workbench smoke tests or has a documented platform limitation.
- [x] Current Media Dock imports the generated Cookie package successfully.
- [x] Full tests, typecheck, validation, build, package, console and visual checks pass.
- [x] Final diff and two-axis code review find no unresolved release-blocking issue.
