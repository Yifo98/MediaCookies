import { buildDetectedServiceRules, cookieMatchesRule, getDomainGroupKey, getServiceRules, normalizeDomain, } from './service-rules.js';
function uniqueSorted(values) {
    return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
export function buildCookiePreviewScan(allCookies, mode, generatedAt = new Date().toISOString()) {
    const timestampSlug = formatTimestampSlug(new Date(generatedAt));
    const uniqueCookies = dedupeCookies(allCookies).sort(sortCookies);
    const rules = buildDetectedServiceRules(uniqueCookies, mode);
    const cookies = filterCookiesByRules(uniqueCookies, rules);
    return {
        generatedAt,
        timestampSlug,
        mode,
        allCookies: uniqueCookies,
        cookies,
        rules,
        supportedCookieCount: cookies.length,
        ignoredCookieCount: mode === 'all' ? 0 : Math.max(0, uniqueCookies.length - cookies.length),
    };
}
export function buildCookieExportFromScan(scan, slugs) {
    const rules = getServiceRules(slugs, scan.rules);
    if (rules.length === 0) {
        throw new Error('请先从预览结果里选择至少一个 Cookie 来源。');
    }
    const cookies = filterCookiesByRules(scan.allCookies, rules);
    const cookieServices = mapCookieServices(cookies, rules);
    const serviceSummaries = rules.map((rule) => buildServiceSummary(rule, cookies));
    const previewRows = buildPreviewRows(cookies, cookieServices);
    const files = buildExportFiles({
        generatedAt: scan.generatedAt,
        timestampSlug: scan.timestampSlug,
        scanMode: scan.mode,
        rules,
        cookies,
        cookieServices,
        previewRows,
        serviceSummaries,
        files: new Map(),
        manifest: emptyManifest(scan.generatedAt, scan.mode),
    });
    const manifest = JSON.parse(files.get('manifest.json') ?? '{}');
    return {
        generatedAt: scan.generatedAt,
        timestampSlug: scan.timestampSlug,
        scanMode: scan.mode,
        rules,
        cookies,
        cookieServices,
        previewRows,
        serviceSummaries,
        files,
        manifest,
    };
}
function filterCookiesByRules(cookies, rules) {
    return cookies.filter((cookie) => rules.some((rule) => cookieMatchesRule(cookie, rule))).sort(sortCookies);
}
function dedupeCookies(cookies) {
    const byKey = new Map();
    cookies.forEach((cookie) => {
        byKey.set(cookieKey(cookie), cookie);
    });
    return [...byKey.values()];
}
function cookieKey(cookie) {
    return `${cookie.storeId}\t${cookie.domain}\t${cookie.path}\t${cookie.name}`;
}
function sortCookies(left, right) {
    return (normalizeDomain(left.domain).localeCompare(normalizeDomain(right.domain)) ||
        left.path.localeCompare(right.path) ||
        left.name.localeCompare(right.name));
}
function mapCookieServices(cookies, rules) {
    const result = new Map();
    cookies.forEach((cookie) => {
        const slugs = rules
            .filter((rule) => cookieMatchesRule(cookie, rule))
            .map((rule) => rule.slug);
        result.set(cookieKey(cookie), slugs);
    });
    return result;
}
function buildPreviewRows(cookies, cookieServices) {
    return cookies.map((cookie) => ({
        domain: cookie.domain,
        name: cookie.name,
        path: cookie.path,
        expiry: formatExpiry(cookie),
        status: cookie.expiryStatus,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        services: cookieServices.get(cookieKey(cookie)) ?? [],
    }));
}
function buildServiceSummary(rule, cookies) {
    const serviceCookies = cookies.filter((cookie) => cookieMatchesRule(cookie, rule));
    const activeNames = new Set(serviceCookies
        .filter((cookie) => cookie.expiryStatus !== 'expired')
        .map((cookie) => cookie.name.toLowerCase()));
    const presentStrongMarkers = rule.strongLoginMarkers.filter((name) => activeNames.has(name.toLowerCase()));
    const presentWeakMarkers = rule.weakLoginMarkers.filter((name) => activeNames.has(name.toLowerCase()));
    const missingStrongMarkers = rule.strongLoginMarkers.filter((name) => !activeNames.has(name.toLowerCase()));
    const loginStatus = getLoginStatusForRule(rule, serviceCookies.length, presentStrongMarkers, presentWeakMarkers, missingStrongMarkers);
    return {
        slug: rule.slug,
        title: rule.title,
        sourceKind: rule.sourceKind,
        note: rule.note,
        successTips: rule.successTips,
        cookieCount: serviceCookies.length,
        domains: uniqueSorted(serviceCookies.map((cookie) => normalizeDomain(cookie.domain))),
        expiredCount: serviceCookies.filter((cookie) => cookie.expiryStatus === 'expired').length,
        expiringSoonCount: serviceCookies.filter((cookie) => cookie.expiryStatus === 'soon').length,
        loginStatus,
        presentStrongMarkers,
        presentWeakMarkers,
        missingStrongMarkers,
    };
}
function getLoginStatusForRule(rule, cookieCount, presentStrongMarkers, presentWeakMarkers, missingStrongMarkers) {
    if (cookieCount === 0)
        return 'missing';
    if (rule.strongLoginMarkers.length === 0 && rule.weakLoginMarkers.length === 0)
        return 'partial';
    const hasStrongLogin = rule.strongMarkerMode === 'all'
        ? missingStrongMarkers.length === 0
        : presentStrongMarkers.length > 0;
    if (hasStrongLogin)
        return 'strong';
    return presentWeakMarkers.length > 0 || presentStrongMarkers.length > 0 ? 'partial' : 'missing';
}
function buildExportFiles(bundle) {
    const byService = buildServiceFiles(bundle.rules, bundle.cookies);
    const byDomain = buildDomainFiles(bundle.cookies);
    const manifest = buildManifest(bundle, byService, byDomain);
    const files = new Map();
    files.set('cookies.txt', toNetscapeFile(bundle.cookies, 'All selected Media Dock cookies'));
    byService.forEach((content, filename) => files.set(filename, content));
    byDomain.forEach((content, filename) => files.set(filename, content));
    files.set('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
    files.set('README.txt', buildExportReadme(bundle, manifest));
    return files;
}
function buildServiceFiles(rules, cookies) {
    const files = new Map();
    rules.forEach((rule) => {
        const serviceCookies = cookies.filter((cookie) => cookieMatchesRule(cookie, rule));
        if (serviceCookies.length === 0)
            return;
        files.set(`by-service/${rule.slug}.cookies.txt`, toNetscapeFile(serviceCookies, `${rule.title} cookies`));
    });
    return files;
}
function buildDomainFiles(cookies) {
    const groups = new Map();
    cookies.forEach((cookie) => {
        const groupKey = getDomainGroupKey(cookie.domain);
        const current = groups.get(groupKey) ?? [];
        current.push(cookie);
        groups.set(groupKey, current);
    });
    const files = new Map();
    [...groups.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([groupKey, groupCookies]) => {
        files.set(`by-domain/${safeFilename(groupKey)}.cookies.txt`, toNetscapeFile(groupCookies, `${groupKey} cookies`));
    });
    return files;
}
function buildManifest(bundle, byService, byDomain) {
    return {
        generated_at: bundle.generatedAt,
        scan_mode: bundle.scanMode,
        format: 'Netscape cookies.txt',
        generator: 'XF MediaCookies',
        privacy: {
            password_exported: false,
            cookie_values_in_manifest: false,
            network_upload: false,
        },
        total_cookie_lines: bundle.cookies.length,
        expiry_summary: {
            valid: bundle.cookies.filter((cookie) => cookie.expiryStatus === 'valid').length,
            session: bundle.cookies.filter((cookie) => cookie.expiryStatus === 'session').length,
            expired: bundle.cookies.filter((cookie) => cookie.expiryStatus === 'expired').length,
            expiring_soon: bundle.cookies.filter((cookie) => cookie.expiryStatus === 'soon').length,
        },
        outputs: {
            raw_file: 'cookies.txt',
            by_service_dir: 'by-service',
            by_domain_dir: 'by-domain',
        },
        service_files: bundle.serviceSummaries
            .filter((summary) => byService.has(`by-service/${summary.slug}.cookies.txt`))
            .map((summary) => ({
            slug: summary.slug,
            title: summary.title,
            filename: `by-service/${summary.slug}.cookies.txt`,
            cookie_count: summary.cookieCount,
            domains: summary.domains,
            login_status: summary.loginStatus,
            present_strong_markers: summary.presentStrongMarkers,
            present_weak_markers: summary.presentWeakMarkers,
            missing_strong_markers: summary.missingStrongMarkers,
            note: summary.note,
            success_tips: summary.successTips,
        })),
        domain_files: [...byDomain.entries()].map(([filename, content]) => ({
            domain: filename.replace(/^by-domain\//, '').replace(/\.cookies\.txt$/, ''),
            filename,
            cookie_count: countCookieLines(content),
        })),
    };
}
function emptyManifest(generatedAt, scanMode) {
    return {
        generated_at: generatedAt,
        scan_mode: scanMode,
        format: 'Netscape cookies.txt',
        generator: 'XF MediaCookies',
        privacy: {
            password_exported: false,
            cookie_values_in_manifest: false,
            network_upload: false,
        },
        total_cookie_lines: 0,
        expiry_summary: {
            valid: 0,
            session: 0,
            expired: 0,
            expiring_soon: 0,
        },
        outputs: {
            raw_file: 'cookies.txt',
            by_service_dir: 'by-service',
            by_domain_dir: 'by-domain',
        },
        service_files: [],
        domain_files: [],
    };
}
function toNetscapeFile(cookies, title) {
    const lines = [
        '# Netscape HTTP Cookie File',
        '# Generated by XF MediaCookies',
        `# ${title}`,
        '# This file contains sensitive browser cookies. Keep it local.',
        '',
        ...cookies.map(formatNetscapeLine),
        '',
    ];
    return lines.join('\n');
}
function formatNetscapeLine(cookie) {
    const domain = formatNetscapeDomain(cookie);
    const includeSubdomains = cookie.hostOnly ? 'FALSE' : 'TRUE';
    const secure = cookie.secure ? 'TRUE' : 'FALSE';
    return [
        domain,
        includeSubdomains,
        sanitizeField(cookie.path || '/'),
        secure,
        String(cookie.expirationDate || 0),
        sanitizeField(cookie.name),
        sanitizeField(cookie.value),
    ].join('\t');
}
function formatNetscapeDomain(cookie) {
    const normalized = normalizeDomain(cookie.domain);
    const domain = cookie.hostOnly ? normalized : cookie.domain.startsWith('.') ? cookie.domain : `.${normalized}`;
    return cookie.httpOnly ? `#HttpOnly_${domain}` : domain;
}
function sanitizeField(value) {
    return value.replace(/[\r\n]/g, '').replace(/\t/g, '%09');
}
function formatExpiry(cookie) {
    if (cookie.expiryStatus === 'session')
        return 'Session';
    return new Date(cookie.expirationDate * 1000).toLocaleString();
}
function safeFilename(value) {
    return value.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
}
function countCookieLines(content) {
    return content
        .split(/\r?\n/)
        .filter((line) => line.trim() && !line.startsWith('#'))
        .length;
}
function buildExportReadme(bundle, manifest) {
    const serviceLines = manifest.service_files
        .map((item) => `- ${item.title}: ${item.filename} (${item.cookie_count} cookies, login status: ${item.login_status})`)
        .join('\n');
    return [
        'Media Dock Cookie Export',
        '',
        `Generated at: ${bundle.generatedAt}`,
        '',
        'How to use:',
        '1. Before exporting, open the target site in the same browser profile and confirm the normal login state is active.',
        '2. Open and play the target content first so the browser refreshes the site login state. If the preview reports missing login markers, refresh the site login before exporting.',
        '3. Open Media Dock and use the Cookies area to import this ZIP directly.',
        '4. If importing manually, unzip this package and copy the folder or selected by-service/*.cookies.txt files into Media Dock Data/cookies/.',
        '5. Paste a target link; Media Dock will recommend the matching by-service cookie file.',
        '',
        'Privacy notes:',
        '- This export contains browser cookies and should stay on your own machine.',
        '- No passwords are exported.',
        '- manifest.json contains only counts, domains, marker names, and status summaries; it does not contain cookie values.',
        '',
        'Included services:',
        serviceLines || '- No service cookies were found.',
        '',
    ].join('\n');
}
function formatTimestampSlug(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
        '-',
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds()),
    ].join('');
}
