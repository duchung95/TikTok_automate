import { useEffect, useState, useMemo } from 'react';
import { Title, Text, Stack, ActionIcon, Tooltip } from '@mantine/core'
import { IconCopy, IconCheck } from '@tabler/icons-react'

import { GdriveImage } from '../orders/OrdersTable';
import { extractGdriveId, gdriveThumbnailUrl } from '../orders/gdriveUtils';

/** Thumbnail image on top + copy-to-clipboard button on bottom, combined in one cell */
const ImageCopyCell = ({ imageUrl, linkUrl }: { imageUrl: string; linkUrl: string }) => {
  const [copied, setCopied] = useState(false);

  if (!imageUrl && !linkUrl) return null;

  const fileId = imageUrl ? extractGdriveId(imageUrl) : null;
  const publicThumbnailUrl = fileId ? gdriveThumbnailUrl(fileId, 400) : '';

  const handleCopy = () => {
    if (!linkUrl) return;
    navigator.clipboard.writeText(linkUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Stack align="left" gap="xs">
      {fileId && (
        <GdriveImage
          href={imageUrl}
          fileId={fileId}
          publicThumbnailUrl={publicThumbnailUrl}
          label=""
          ignore={false}
          onShowModal={() => {}}
        />
      )}
      {linkUrl && (
        <Tooltip label={copied ? 'Copied!' : 'Copy link'}>
          <ActionIcon
            variant="light"
            color={copied ? 'green' : 'blue'}
            size="sm"
            onClick={handleCopy}
          >
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          </ActionIcon>
        </Tooltip>
      )}
    </Stack>
  );
};

export default ImageCopyCell;