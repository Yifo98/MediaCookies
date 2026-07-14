import '../base.css'
import './styles.css'
import {
  MediaCookiesWorkflowError,
  createMediaCookiesWorkflow,
  type WorkbenchSnapshot,
} from '../../application/media-cookies-workflow'
import {
  DEFAULT_PREFERENCES,
  type Language,
  type UserPreferences,
} from '../../domain/user-preferences'
import { createChromeBrowserAdapter } from '../../platform/chrome-browser-adapter'
import { getButton, getElement, getSelect } from '../dom'
import { applyStaticCopy, translate, type CopyKey } from '../i18n'

const workflow = createMediaCookiesWorkflow({ browser: createChromeBrowserAdapter() })
const statusBox = getElement('workbench-status')
const sourceList = getElement('source-list')
const summaryGrid = getElement('summary-grid')
const previewBody = getElement('preview-body')
const previewEmpty = getElement('preview-empty')
const selectionLabel = getElement('selection-label')
const languageSelect = getSelect('language-select')
const scanSupported = getButton('scan-supported')
const scanAll = getButton('scan-all')
const selectAll = getButton('select-all')
const selectNone = getButton('select-none')
const selectCommon = getButton('select-common')
const saveCommon = getButton('save-common')
const clearScan = getButton('clear-scan')
const exportSelected = getButton('export-selected')

let currentSnapshot: WorkbenchSnapshot | null = null
let selectedSources = new Set<string>()
let language: Language = 'zh-CN'
let preferences: UserPreferences = structuredClone(DEFAULT_PREFERENCES)
let isBusy = false
let currentStatus: {
  key: CopyKey
  values?: Record<string, string | number>
  tone: 'idle' | 'success' | 'error'
} = { key: 'workbenchInitialStatus', tone: 'idle' }

scanSupported.addEventListener('click', () => void scan('supported'))
scanAll.addEventListener('click', () => void scan('all'))
selectAll.addEventListener('click', () => setSelection(currentSnapshot?.sources.map((source) => source.slug) ?? []))
selectNone.addEventListener('click', () => setSelection([]))
selectCommon.addEventListener('click', applyCommonSources)
saveCommon.addEventListener('click', () => void saveCurrentAsCommon())
clearScan.addEventListener('click', clearCurrentScan)
exportSelected.addEventListener('click', () => void exportCurrentSelection())
languageSelect.addEventListener('change', () => void changeLanguage(languageSelect.value as Language))

void init()

async function init() {
  preferences = await workflow.loadPreferences()
  setLanguage(preferences.language)
  render()
  const initialScan = getInitialScanMode()
  if (initialScan) {
    window.history.replaceState(null, '', window.location.pathname)
    await scan(initialScan)
  }
}

async function changeLanguage(nextLanguage: Language) {
  await workflow.setLanguage(nextLanguage)
  preferences = { ...preferences, language: nextLanguage }
  setLanguage(nextLanguage)
  render()
}

function setLanguage(nextLanguage: Language) {
  language = nextLanguage
  languageSelect.value = language
  document.documentElement.lang = language
  document.title = translate(language, 'workbenchDocumentTitle')
  applyStaticCopy(document, language)
  renderStatus()
}

async function scan(mode: 'supported' | 'all') {
  setBusy(true)
  setStatus(mode === 'supported' ? 'scanningSupported' : 'scanningAll')
  try {
    currentSnapshot = await workflow.scanAllSources(mode)
    selectedSources = new Set(currentSnapshot.sources.map((source) => source.slug))
    render()
    const hasOneSource = currentSnapshot.sources.length === 1
    setStatus(
      currentSnapshot.ignoredCookieCount > 0
        ? (hasOneSource ? 'scanCompleteIgnoredOne' : 'scanCompleteIgnored')
        : (hasOneSource ? 'scanCompleteOne' : 'scanComplete'),
      {
        count: currentSnapshot.sources.length,
        ignored: currentSnapshot.ignoredCookieCount,
      },
      'success',
    )
  } catch (error) {
    showError(error)
  } finally {
    setBusy(false)
  }
}

async function exportCurrentSelection() {
  if (selectedSources.size === 0) return
  setBusy(true)
  setStatus('packageGenerating')
  try {
    const receipt = await workflow.exportSelectedSources([...selectedSources])
    clearRenderedScan()
    setStatus('packageComplete', { filename: receipt.filename }, 'success')
  } catch (error) {
    showError(error)
  } finally {
    setBusy(false)
  }
}

async function saveCurrentAsCommon() {
  if (selectedSources.size === 0) return
  preferences = {
    ...preferences,
    commonSourceSlugs: await workflow.saveCommonSources([...selectedSources]),
  }
  setStatus('commonSavedDone', { count: preferences.commonSourceSlugs.length }, 'success')
}

function applyCommonSources() {
  if (!currentSnapshot) return
  const available = new Set(currentSnapshot.sources.map((source) => source.slug))
  const matched = preferences.commonSourceSlugs.filter((slug) => available.has(slug))
  setSelection(matched)
  setStatus('commonApplied', { count: matched.length }, 'success')
}

function clearCurrentScan() {
  workflow.clearTemporaryScan()
  clearRenderedScan()
  setStatus('scanCleared')
}

function clearRenderedScan() {
  currentSnapshot = null
  selectedSources = new Set()
  render()
}

function setSelection(slugs: string[]) {
  selectedSources = new Set(slugs)
  render()
}

function render() {
  renderSources()
  renderSummary()
  renderPreview()
  updateActions()
  renderStatus()
}

function renderSources() {
  sourceList.replaceChildren()
  if (!currentSnapshot || currentSnapshot.sources.length === 0) {
    sourceList.append(createEmpty(translate(language, 'sourceEmpty')))
    return
  }

  const fragment = document.createDocumentFragment()
  currentSnapshot.sources.forEach((source) => {
    const label = document.createElement('label')
    label.className = 'source-card'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = selectedSources.has(source.slug)
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedSources.add(source.slug)
      else selectedSources.delete(source.slug)
      renderSummary()
      renderPreview()
      updateActions()
    })
    const content = document.createElement('span')
    content.className = 'source-card__content'
    const titleRow = document.createElement('span')
    titleRow.className = 'source-card__title'
    const title = document.createElement('strong')
    title.textContent = source.title
    const status = document.createElement('span')
    status.className = 'status-pill'
    status.dataset.status = source.status
    status.textContent = getSourceStatusLabel(source.status)
    const detail = document.createElement('small')
    detail.textContent = translate(language, 'sourceDetail', {
      count: source.cookieCount,
      domains: source.domains.join(', ') || translate(language, 'sourceNoDomain'),
    })
    titleRow.append(title, status)
    content.append(titleRow, detail)
    label.append(checkbox, content)
    fragment.append(label)
  })
  sourceList.append(fragment)
}

function renderSummary() {
  const selected = currentSnapshot?.sources.filter((source) => selectedSources.has(source.slug)) ?? []
  const values: Array<[string, CopyKey]> = [
    [String(selected.length), 'summarySelected'],
    [String(selected.reduce((sum, source) => sum + source.cookieCount, 0)), 'summaryCookies'],
    [String(selected.filter((source) => source.status === 'at-risk').length), 'summaryAtRisk'],
    [String(currentSnapshot?.ignoredCookieCount ?? 0), 'summaryIgnored'],
  ]
  summaryGrid.replaceChildren()
  values.forEach(([value, label]) => {
    const item = document.createElement('div')
    const strong = document.createElement('strong')
    strong.textContent = value
    const span = document.createElement('span')
    span.textContent = translate(language, label)
    item.append(strong, span)
    summaryGrid.append(item)
  })
}

function renderPreview() {
  previewBody.replaceChildren()
  const rows = currentSnapshot?.previewRows.filter((row) =>
    row.services.some((slug) => selectedSources.has(slug)),
  ) ?? []
  previewEmpty.hidden = rows.length > 0
  const fragment = document.createDocumentFragment()
  rows.forEach((row) => {
    const tr = document.createElement('tr')
    const cells = [
      row.domain,
      row.name,
      row.path,
      row.expiry,
      getExpiryLabel(row.status),
      getSecurityFlags(row.secure, row.httpOnly),
      row.services.join(', '),
    ]
    cells.forEach((value) => {
      const td = document.createElement('td')
      td.textContent = value
      tr.append(td)
    })
    fragment.append(tr)
  })
  previewBody.append(fragment)
}

function getSecurityFlags(secure: boolean, httpOnly: boolean): string {
  const flags = [
    secure ? translate(language, 'flagSecure') : null,
    httpOnly ? translate(language, 'flagHttpOnly') : null,
  ].filter((flag): flag is string => flag !== null)
  return flags.join(' · ') || translate(language, 'flagNone')
}

function updateActions() {
  const hasScan = currentSnapshot !== null
  scanSupported.setAttribute('aria-pressed', String(currentSnapshot?.scanMode === 'supported'))
  scanAll.setAttribute('aria-pressed', String(currentSnapshot?.scanMode === 'all'))
  scanSupported.disabled = isBusy
  scanAll.disabled = isBusy
  selectAll.disabled = isBusy || !hasScan
  selectNone.disabled = isBusy || !hasScan
  selectCommon.disabled = isBusy || !hasScan
  saveCommon.disabled = isBusy || !hasScan || selectedSources.size === 0
  clearScan.disabled = isBusy || !hasScan
  exportSelected.disabled = isBusy || !hasScan || selectedSources.size === 0
  selectionLabel.textContent = selectedSources.size === 0
    ? translate(language, 'selectionNone')
    : translate(language, selectedSources.size === 1 ? 'selectionOne' : 'selectionCount', {
      count: selectedSources.size,
    })
}

function setBusy(nextBusy: boolean) {
  isBusy = nextBusy
  updateActions()
}

function setStatus(
  key: CopyKey,
  values?: Record<string, string | number>,
  tone: 'idle' | 'success' | 'error' = 'idle',
) {
  currentStatus = { key, values, tone }
  renderStatus()
}

function renderStatus() {
  statusBox.textContent = translate(language, currentStatus.key, currentStatus.values)
  statusBox.dataset.tone = currentStatus.tone
}

function showError(error: unknown) {
  if (error instanceof MediaCookiesWorkflowError && error.code === 'ALL_SOURCE_ACCESS_DENIED') {
    setStatus('broadAccessDenied', undefined, 'error')
    return
  }
  statusBox.textContent = error instanceof Error ? error.message : String(error)
  statusBox.dataset.tone = 'error'
}

function createEmpty(message: string) {
  const empty = document.createElement('p')
  empty.className = 'empty-state'
  empty.textContent = message
  return empty
}

function getSourceStatusLabel(status: string) {
  if (status === 'ready') return translate(language, 'sourceReady')
  if (status === 'sign-in') return translate(language, 'sourceSignIn')
  return translate(language, 'sourceAtRisk')
}

function getExpiryLabel(status: string) {
  if (status === 'session') return translate(language, 'expirySession')
  if (status === 'expired') return translate(language, 'expiryExpired')
  if (status === 'soon') return translate(language, 'expirySoon')
  return translate(language, 'expiryValid')
}

function getInitialScanMode(): 'supported' | 'all' | null {
  const scanMode = new URLSearchParams(window.location.search).get('scan')
  return scanMode === 'supported' || scanMode === 'all' ? scanMode : null
}
