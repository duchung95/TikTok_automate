/**
 * Extracts a Google Drive file ID from various share URL formats.
 * Supports:
 *   https://drive.google.com/file/d/{ID}/view
 *   https://drive.google.com/open?id={ID}
 *   https://drive.google.com/uc?id={ID}
 */
export const extractGdriveId = (url: string): string | null => {
  if (!url) return null

  // Format: /d/{ID}/
  const slashMatch = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/)
  if (slashMatch) return slashMatch[1]

  // Format: ?id={ID} or &id={ID}
  const paramMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/)
  if (paramMatch) return paramMatch[1]

  return null
};

/**
 * Returns a Google Drive thumbnail URL for a given file ID.
 * The thumbnail is publicly accessible without authentication for shared files.
 */
export const gdriveThumbnailUrl = (fileId: string, size = 200): string => {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`
};

/**
 * Uploads a file to a Google Drive folder using the multipart upload API.
 * Requires an access token with the `drive.file` scope.
 * Returns a standard Google Drive share URL for the uploaded file.
 */
export const uploadFileToDrive = async (
  file: File,
  accessToken: string,
  folderId: string
): Promise<string> => {
  const metadata = {
    name: file.name,
    parents: [folderId],
  }

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Không thể tải ảnh lên: ${res.status}`)
  }

  const { id } = await res.json()
  return `https://drive.google.com/file/d/${id}/view`
}
