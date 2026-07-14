# 06 — Build release and asset validation

**What to build:** A maintainer can build a MediaCookies 0.2.0 package and fail fast when the Cookie package contract or publishing-asset requirements drift.

**Blocked by:** 01 — Establish the testable 0.2.0 foundation.

**Status:** completed

- [x] Version metadata and package naming use MediaCookies 0.2.0.
- [x] The extension package contains only required production files.
- [x] Compatibility validation covers existing source IDs, paths and Netscape Cookie contents.
- [x] Asset validation checks dimensions, color modes, alpha rules and required file counts.
- [x] Check, build and package commands are documented and pass locally.
