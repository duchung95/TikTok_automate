/**
 * Extracts a Google Drive file ID from various share URL formats.
 * Supports:
 *   https://drive.google.com/file/d/{ID}/view
 *   https://drive.google.com/open?id={ID}
 *   https://drive.google.com/uc?id={ID}
 */
export function extractGdriveId(url: string): string | null {
  if (!url) return null

  // Format: /d/{ID}/
  const slashMatch = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/)
  if (slashMatch) return slashMatch[1]

  // Format: ?id={ID} or &id={ID}
  const paramMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/)
  if (paramMatch) return paramMatch[1]

  return null
}

/**
 * Returns a Google Drive thumbnail URL for a given file ID.
 * The thumbnail is publicly accessible without authentication for shared files.
 */
export function gdriveThumbnailUrl(fileId: string, size = 200): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`
}
