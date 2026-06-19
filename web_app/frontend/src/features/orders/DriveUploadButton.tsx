import React from 'react'
import { useState, useRef } from 'react'
import { Box, Tooltip, Button } from '@mantine/core'
import { uploadFileToDrive } from './gdriveUtils'
import { useGoogleAuth } from './GoogleAuthContext'
import { GOOGLE_DRIVE_UPLOAD_FOLDER_ID } from '../../config'

interface DriveUploadButtonProps {
  label: string
  onChange: (url: string) => void
}

/**
 * A small upload button that lets the user pick an image file,
 * uploads it to the configured Google Drive folder, then calls onChange with the resulting URL.
 */
const DriveUploadButton = ({ label, onChange }: DriveUploadButtonProps) => {
  const { signedIn, accessToken } = useGoogleAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (!file || !accessToken) return
    setIsUploading(true)
    setUploadError(null)
    try {
      const url = await uploadFileToDrive(file, accessToken, GOOGLE_DRIVE_UPLOAD_FOLDER_ID)
      onChange(url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      // Reset so the same file can be re-uploaded if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tooltipLabel = !signedIn
    ? 'Đăng nhập Google để upload'
    : uploadError ?? `Tải ảnh lên Drive (${label})`

  return (
    <Tooltip label={tooltipLabel} position="bottom" withArrow color={uploadError ? 'red' : undefined}>
      <Box>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={!signedIn || isUploading}
        />
        <Button
          size="xs"
          variant="light"
          color={uploadError ? 'red' : 'blue'}
          disabled={!signedIn || isUploading}
          onClick={() => fileInputRef.current?.click()}
          loading={isUploading}
        >
          Tải lên
        </Button>
      </Box>
    </Tooltip>
  )
}

export { DriveUploadButton }