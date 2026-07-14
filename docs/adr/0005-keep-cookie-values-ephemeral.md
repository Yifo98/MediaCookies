# Keep Cookie values ephemeral

MediaCookies will keep Cookie values only in memory for the active check or export and will never persist them in extension storage, interface state, or cache files. Closing or refreshing an interface requires a new scan, trading convenience for a smaller credential exposure window; only non-sensitive preferences may persist.
