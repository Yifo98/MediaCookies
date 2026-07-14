# 02 — Deliver current-source quick export

**What to build:** A Media Dock 用户 can open MediaCookies on the current source, grant only the needed source access, understand the export status, and download a local Cookie package through one focused action.

**Blocked by:** 01 — Establish the testable 0.2.0 foundation.

**Status:** completed

- [x] Current-source recognition works for curated and supported media sources.
- [x] Source access is requested on demand and denial is recoverable.
- [x] 可以导出, 请先登录, 可能失效 and 当前网页不支持 are behavior-tested.
- [x] 可能失效 allows export while explaining the risk.
- [x] Export completion clears the temporary scan and explains local handoff to Media Dock.
