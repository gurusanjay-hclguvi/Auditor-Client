// The CC source is a PDF, linked by the lead's `confirmationCallLink`; where it lives decides how
// it is framed:
// - Google Drive: share links (".../view", "open?id=") refuse to be framed, so the frame loads
//   Drive's embeddable preview (".../preview") instead.
// - S3 (or any other direct file link): framed as it is; the browser's PDF viewer renders it.
// Returns { kind: 'drive' | 'direct', frameUrl, openUrl }, or null for a missing or non-web link.

const DRIVE_HOSTS = ['drive.google.com', 'docs.google.com']

function parseWebUrl(link) {
  if (!link) return null
  try {
    // Relative links (the mock PDF) resolve against this app
    const url = new URL(link, globalThis.location?.origin)
    return ['http:', 'https:'].includes(url.protocol) ? url : null
  } catch {
    return null
  }
}

function drivePreviewUrl(url) {
  // docs.google.com/document/d/<id>/edit, drive.google.com/file/d/<id>/view
  const pathMatch = url.pathname.match(/^(.*?\/d\/[^/]+)/)
  if (pathMatch) return `${url.origin}${pathMatch[1]}/preview`
  // drive.google.com/open?id=<id>, drive.google.com/uc?id=<id>&export=download
  const id = url.searchParams.get('id')
  if (id) return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`
  return url.href
}

export function getPdfSource(link) {
  const url = parseWebUrl(link?.trim())
  if (!url) return null
  if (DRIVE_HOSTS.includes(url.hostname)) {
    return { kind: 'drive', frameUrl: drivePreviewUrl(url), openUrl: url.href }
  }
  return { kind: 'direct', frameUrl: url.href, openUrl: url.href }
}
