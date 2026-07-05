(() => {
  const root = document.documentElement
  const COMPACT_WIDTH = 420
  const MID_WIDTH = 500
  const WIDE_WIDTH = 560
  const MIN_HEIGHT = 480
  const MAX_HEIGHT = 600
  let browserBounds = null

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }

  function positiveNumber(value) {
    return Number.isFinite(value) && value > 0 ? value : null
  }

  function chooseWidth(availableWidth) {
    if (availableWidth >= 1120) {
      return WIDE_WIDTH
    }

    if (availableWidth >= 820) {
      return MID_WIDTH
    }

    return COMPACT_WIDTH
  }

  function applyPopupSize() {
    const viewportWidth = positiveNumber(window.innerWidth)
    const viewportHeight = positiveNumber(window.innerHeight)
    const screenWidth = positiveNumber(globalThis.screen?.availWidth)
    const screenHeight = positiveNumber(globalThis.screen?.availHeight)
    const browserWidth = positiveNumber(browserBounds?.width)
    const browserHeight = positiveNumber(browserBounds?.height)
    const widthSource = browserWidth ?? viewportWidth ?? screenWidth ?? COMPACT_WIDTH
    const heightSource = browserHeight ?? screenHeight ?? viewportHeight ?? MAX_HEIGHT
    const width = chooseWidth(widthSource)
    const height = clamp(heightSource - 140, MIN_HEIGHT, MAX_HEIGHT)

    root.style.setProperty('--popup-width', `${width}px`)
    root.style.setProperty('--popup-height', `${height}px`)
    root.setAttribute('data-popup-layout', width >= WIDE_WIDTH ? 'wide' : 'compact')
  }

  applyPopupSize()

  try {
    globalThis.chrome?.windows?.getCurrent?.({}, (currentWindow) => {
      if (globalThis.chrome?.runtime?.lastError) {
        return
      }

      browserBounds = {
        height: currentWindow?.height,
        width: currentWindow?.width,
      }
      applyPopupSize()
    })
  } catch {
    browserBounds = null
  }

  window.addEventListener('resize', () => {
    if (!browserBounds) {
      applyPopupSize()
    }
  })
})()
