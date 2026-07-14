import '../base.css'
import {
  MediaCookiesWorkflowError,
  createMediaCookiesWorkflow,
  type MediaPassport,
} from '../../application/media-cookies-workflow'
import { createChromeBrowserAdapter } from '../../platform/chrome-browser-adapter'
import type { Language } from '../../domain/user-preferences'
import { getButton, getElement, getSelect } from '../dom'
import { applyStaticCopy, translate, type CopyKey } from '../i18n'

const sourceLabel = getElement('source-label')
const statusTitle = getElement('status-title')
const statusDetail = getElement('status-detail')
const passport = getElement('passport')
const primaryAction = getButton('primary-action')
const openWorkbench = getButton('open-workbench')
const scanBrowser = getButton('scan-browser')
const browserScanStatus = getElement('browser-scan-status')
const trustRow = getElement('trust-row')
const languageSelect = getSelect('language-select')
const browser = createChromeBrowserAdapter()
const workflow = createMediaCookiesWorkflow({ browser })
let currentPassport: MediaPassport | null = null
let language: Language = 'zh-CN'

void init()

primaryAction.addEventListener('click', () => {
  if (!currentPassport) return
  if (currentPassport.status === 'sign-in' && currentPassport.access === 'granted') {
    void refreshPassport()
    return
  }
  void exportCurrentSource()
})
openWorkbench.addEventListener('click', () => void workflow.openWorkbench())
scanBrowser.addEventListener('click', () => void openWorkbenchWithBrowserScan())
languageSelect.addEventListener('change', () => void changeLanguage(languageSelect.value as Language))

async function init() {
  const preferences = await workflow.loadPreferences()
  setLanguage(preferences.language)
  await refreshPassport()
}

async function changeLanguage(nextLanguage: Language) {
  await workflow.setLanguage(nextLanguage)
  setLanguage(nextLanguage)
  await refreshPassport()
}

function setLanguage(nextLanguage: Language) {
  language = nextLanguage
  languageSelect.value = language
  languageSelect.setAttribute('aria-label', translate(language, 'languageLabel'))
  trustRow.setAttribute('aria-label', translate(language, 'quickPrivacySafeguardsLabel'))
  document.documentElement.lang = language
  document.title = translate(language, 'quickDocumentTitle')
  applyStaticCopy(document, language)
}

async function refreshPassport() {
  try {
    const passport = await workflow.inspectCurrentSource()
    currentPassport = passport
    sourceLabel.textContent = passport.source?.title ?? translate(language, 'quickCurrentPage')
    const copy = getStatusCopy(passport.status, passport.access)
    setPassportStatus(passport.status, passport.access)
    statusTitle.textContent = copy.title
    statusDetail.textContent = copy.detail
    primaryAction.textContent = getActionLabel(passport)
    primaryAction.disabled = passport.status === 'unsupported'
  } catch (error) {
    showError(error)
  }
}

async function openWorkbenchWithBrowserScan() {
  scanBrowser.disabled = true
  browserScanStatus.textContent = translate(language, 'quickBrowserOpening')
  try {
    await workflow.openWorkbench('supported')
  } catch (error) {
    browserScanStatus.textContent = error instanceof MediaCookiesWorkflowError
      && error.code === 'ALL_SOURCE_ACCESS_DENIED'
      ? translate(language, 'quickBrowserDenied')
      : (error instanceof Error ? error.message : String(error))
    scanBrowser.disabled = false
  }
}

async function exportCurrentSource() {
  primaryAction.disabled = true
  primaryAction.textContent = translate(language, 'quickGenerating')
  try {
    const receipt = await workflow.exportCurrentSource()
    statusTitle.textContent = translate(language, 'quickExportDone')
    statusDetail.textContent = translate(language, 'quickExportDoneDetail', { filename: receipt.filename })
    primaryAction.textContent = translate(language, 'quickExported')
  } catch (error) {
    if (error instanceof MediaCookiesWorkflowError && error.code === 'CURRENT_SOURCE_SIGN_IN_REQUIRED') {
      await refreshPassport()
      return
    }
    showError(error)
  }
}

function getStatusCopy(status: string, access: string): { title: string; detail: string } {
  if (access === 'required') {
    return {
      title: translate(language, 'quickAccessTitle'),
      detail: translate(language, 'quickAccessDetail'),
    }
  }
  if (status === 'ready') {
    return translatePair('quickReadyTitle', 'quickReadyDetail')
  }
  if (status === 'at-risk') {
    return translatePair('quickAtRiskTitle', 'quickAtRiskDetail')
  }
  if (status === 'sign-in') {
    return translatePair('quickSignInTitle', 'quickSignInDetail')
  }
  return translatePair('quickUnsupportedTitle', 'quickUnsupportedDetail')
}

function getActionLabel(passport: MediaPassport): string {
  if (passport.access === 'required') return translate(language, 'quickAuthorizeExport')
  if (passport.status === 'sign-in') return translate(language, 'quickSignInAction')
  if (passport.status === 'unsupported') return translate(language, 'quickUnavailable')
  return translate(language, 'quickExportAction')
}

function showError(error: unknown) {
  passport.dataset.status = 'error'
  if (error instanceof MediaCookiesWorkflowError && error.code === 'SOURCE_ACCESS_DENIED') {
    statusTitle.textContent = translate(language, 'quickAccessDeniedTitle')
    statusDetail.textContent = translate(language, 'quickAccessDeniedDetail')
  } else if (error instanceof MediaCookiesWorkflowError && error.code === 'CURRENT_SOURCE_UNSUPPORTED') {
    statusTitle.textContent = translate(language, 'quickUnsupportedTitle')
    statusDetail.textContent = translate(language, 'quickUnsupportedDetail')
  } else {
    statusTitle.textContent = translate(language, 'quickTemporaryError')
    statusDetail.textContent = error instanceof Error ? error.message : String(error)
  }
  primaryAction.textContent = translate(language, 'quickRetry')
  primaryAction.disabled = false
}

function setPassportStatus(status: string, access: string) {
  passport.dataset.status = access === 'required' ? 'access' : status
}

function translatePair(title: CopyKey, detail: CopyKey) {
  return {
    title: translate(language, title),
    detail: translate(language, detail),
  }
}
