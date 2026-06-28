import React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Checkbox, Badge, Text, Box, Stack, Group, TextInput, Tooltip, Loader, Select } from '@mantine/core'
import type { OrderItem } from './types'
import { extractGdriveId, gdriveThumbnailUrl } from './gdriveUtils'
import { Modal, Button } from '@mantine/core'
import { useGoogleLogin } from '@react-oauth/google'
import { useGoogleAuth } from './GoogleAuthContext'
import { isRowReady } from './csvParser'
import { DriveUploadButton } from './DriveUploadButton'
import { Row } from 'exceljs'

interface OrdersTableProps {
  items: OrderItem[]
  checked: Record<string, boolean>
  onToggleChecked: (rowKey: string) => void
  onUpdateItem: (index: number, patch: Partial<OrderItem>) => void
}

type RowStatus = 'locked' | 'partial' | 'needs-link-label' | 'needs-design' | 'needs-mockup' | 'ready'

export const getRowStatus = (item: OrderItem): RowStatus => {
  if (!item.variantId) return 'locked'
  if (!item.variantId && !item.isPartialLock) return 'locked'
  if (item.isPartialLock) return 'partial'
  if (!item.linkLabel.trim()) return 'needs-link-label'
  if (!item.designFront.trim() && !item.designBack.trim()) return 'needs-design'
  if (!item.mockupFront.trim() && !item.mockupBack.trim()) return 'needs-mockup'
  return 'ready'
}

const STATUS_SORT_ORDER: Record<RowStatus, number> = {
  locked:             0,
  partial:            1,
  'needs-link-label': 2,
  'needs-design':     3,
  'needs-mockup':     4,
  ready:              5,
}

const STATUS_BADGE: Record<RowStatus, { color: string; label: string }> = {
  locked:             { color: 'red',    label: '❌ Thiếu Variant ID'  },
  partial:            { color: 'orange', label: '⚠️ Đơn không đầy đủ' },
  'needs-link-label': { color: 'yellow', label: '🏷 Cần Link Label'    },
  'needs-design':     { color: 'yellow', label: '🖼 Cần URL thiết kế'  },
  'needs-mockup':     { color: 'yellow', label: '🖼 Cần URL mockup'    },
  ready:              { color: 'green',  label: '✅ Sẵn sàng'          },
}

// Matches Python ORDER_PALETTE — cycles per unique orderId
const ORDER_PALETTE = [
  '#c9e8f9', // blue
  '#c9f0d4', // green
  '#fdf3c0', // yellow
  '#e8d8f5', // lavender
  '#fad9b0', // peach
  '#c5ede4', // teal
]

const LOCKED_BG  = 'var(--mantine-color-red-1)'
const PARTIAL_BG = 'var(--mantine-color-orange-1)'

const buildOrderColorMap = (items: OrderItem[]): Map<string, string> => {
  const map = new Map<string, string>()
  for (const item of items) {
    if (!map.has(item.orderId)) {
      map.set(item.orderId, ORDER_PALETTE[map.size % ORDER_PALETTE.length])
    }
  }
  return map
}

const getRowBg = (item: OrderItem, orderColorMap: Map<string, string>): string => {
  if (!item.variantId && !item.isPartialLock) return LOCKED_BG
  if (item.isPartialLock) return PARTIAL_BG
  return orderColorMap.get(item.orderId) ?? '#ffffff'
}

type RowData = OrderItem & { originalIndex: number }

interface UrlFieldProps {
  label: string
  value: string
  onChange: (val: string) => void
  showPreview?: boolean
}

const UrlField = ({ label, value, onChange, showPreview = true }: UrlFieldProps) => {
  const fileId = showPreview ? extractGdriveId(value) : null
  const thumbUrl = fileId ? gdriveThumbnailUrl(fileId, 400) : null

  return (
    <Group gap={4} align="center">
      <Text size="11px" c="dimmed" w={90} style={{ flexShrink: 0 }}>{label}:</Text>
      <TextInput
        size="xs"
        styles={{ input: { fontSize: '11px', height: 24, minHeight: 24 } }}
        placeholder="Enter label…"
        value={value}
        onChange={e => onChange(e.currentTarget.value)}
        style={{ width: 300, flexShrink: 0 }}
      />
      <DriveUploadButton label={label} onChange={onChange} />
    </Group>
  )
}

interface UrlPairProps {
  labelA: string
  valueA: string
  onChangeA: (val: string) => void
  labelB: string
  valueB: string
  onChangeB: (val: string) => void
}

interface UrlQuadItem {
  label: string
  value: string
  onChange: (val: string) => void
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 800

/**
 * Renders a Google Drive thumbnail with automatic retry on load failure.
 *
 * Root cause: on the first request in a browser tab, Google's CDN hasn't
 * established a session yet and may return an auth redirect (HTML) instead
 * of the image — causing a broken/question-mark state.
 * By the time a second input tries the same URL, the session is warmed up.
 *
 * Fix: retry up to MAX_RETRIES times after RETRY_DELAY_MS each time.
 * `key={thumbUrl-attempt}` forces a fresh <img> element on every retry,
 * clearing any cached failure state in the browser.
 */
const GdriveImage = ({ href, fileId, publicThumbnailUrl, label, ignore, onShowModal }: {
  href: string; fileId: string; publicThumbnailUrl: string; label: string;
  ignore: boolean; onShowModal: () => void;
}) => {
  const { signedIn, accessToken } = useGoogleAuth()
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    let revoked = false
    let objectUrl: string | null = null
    if (signedIn && fileId && accessToken) {
      setLoading(true)
      setError(false)
      fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
        .then(res => {
          if (!res.ok) throw new Error('Không tải được ảnh')
          return res.blob()
        })
        .then(blob => {
          objectUrl = URL.createObjectURL(blob)
          if (!revoked) setImgUrl(objectUrl)
        })
        .catch(() => { if (!revoked) setError(true) })
        .finally(() => { if (!revoked) setLoading(false) })
      return () => {
        revoked = true
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }
    } else if (ignore && publicThumbnailUrl) {
      setImgUrl(publicThumbnailUrl)
    } else {
      setImgUrl(null)
    }
  }, [fileId, ignore, signedIn, accessToken])

  const handlePreviewClick = () => {
    if (!signedIn && !ignore) {
      onShowModal()
    } else if (imgUrl) {
      setPreviewOpen(true)
    }
  }

  return (
    <>
      {loading && <Loader size="sm" />}
      {error && <Box color="red">Không tải được ảnh</Box>}
      {!loading && !error && imgUrl && (
        <Tooltip label="Nhấn để xem lớn" position="top">
          <img
            src={imgUrl}
            alt={label}
            style={{ width: 80, height: 80, borderRadius: 4, objectFit: 'cover', cursor: 'pointer' }}
            onClick={handlePreviewClick}
          />
        </Tooltip>
      )}
      <Modal
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={label}
        centered
        size="65vw"
        styles={{ body: { height: '65vh', display: 'flex', flexDirection: 'column' } }}
      >
        <Stack gap="md" align="center" style={{ flex: 1, justifyContent: 'center' }}>
          <img
            src={imgUrl || ''}
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain' }}
          />
          <Button
            component="a"
            href={href}
            target="_blank"
            rel="noreferrer"
            variant="light"
            size="sm"
          >
            Mở trong Google Drive ↗
          </Button>
        </Stack>
      </Modal>
    </>
  )
}

const UrlQuad = ({ items }: { items: UrlQuadItem[] }) => {
  const { signedIn, signIn } = useGoogleAuth()
  const [modalState, setModalState] = useState<Record<string, { show: boolean; ignore: boolean }>>({})

  useEffect(() => {
    if (signedIn) {
      setModalState(s => {
        const newState = { ...s }
        Object.keys(newState).forEach(k => { newState[k].show = false })
        return newState
      })
    }
  }, [signedIn])

  const handleBlur = (label: string, value: string) => {
    const fileId = extractGdriveId(value)
    if (fileId && !signedIn && !(modalState[label]?.ignore)) {
      setModalState(s => ({ ...s, [label]: { show: true, ignore: false } }))
    }
  }

  const handleIgnore = (label: string) => {
    setModalState(s => ({ ...s, [label]: { show: false, ignore: true } }))
  }

  return (
    <Group gap="md" align="flex-start">
      {items.map(({ label, value, onChange }) => {
        const fileId = extractGdriveId(value)
        const publicThumbnailUrl = fileId ? gdriveThumbnailUrl(fileId, 400) : ''
        const showModal = modalState[label]?.show || false
        const ignore = modalState[label]?.ignore || false
        return (
          <Stack key={label} gap={3}>
            <TextInput
              size="xs"
              styles={{ input: { fontSize: '11px', height: 24, minHeight: 24 } }}
              placeholder={label}
              value={value}
              onChange={e => onChange(e.currentTarget.value)}
              onBlur={() => handleBlur(label, value)}
              style={{ width: 180, flexShrink: 0 }}
            />
            <Group gap={4} align="flex-start" style={{ width: 180 }}>
              <Stack gap={2} style={{ flex: 1, alignItems: 'center' }}>
                <Text size="10px" c="dimmed" style={{ textAlign: 'center' }}>{label}</Text>
                <DriveUploadButton label={label} onChange={onChange} />
              </Stack>
              {fileId
                ? <>
                    <GdriveImage
                      href={value}
                      fileId={fileId}
                      publicThumbnailUrl={publicThumbnailUrl}
                      label={label}
                      ignore={ignore}
                      onShowModal={() => setModalState(s => ({ ...s, [label]: { show: true, ignore: false } }))}
                    />
                    <Modal opened={showModal} onClose={() => setModalState(s => ({ ...s, [label]: { ...s[label], show: false } }))} title="Yêu cầu đăng nhập Google" centered>
                      <Box mb="md">Bạn cần đăng nhập Google để xem ảnh. Tiếp tục mà không đăng nhập có thể không xem được ảnh. Đăng nhập Google?</Box>
                      <Button color="blue" onClick={signIn}>Đăng nhập Google</Button>
                      <Button color="gray" ml="sm" onClick={() => handleIgnore(label)}>Bỏ qua</Button>
                    </Modal>
                  </>
                : <Box w={80} h={80} style={{ borderRadius: 4, background: 'var(--mantine-color-gray-2)' }} />
              }
            </Group>
          </Stack>
        )
      })}
    </Group>
  )
}

/** Shows up to 2 thumbnails inline. If more than 2, adds a "+N more" button. Clicking any opens the full gallery modal. */
const MainImagePreview = ({ images, alt }: { images: string[]; alt: string }) => {
  const [opened, setOpened] = useState(false)

  if (!images || images.length === 0)
    return <Text size="xs" c="dimmed">No image</Text>

  const IMAGE_PREVIEW = 1;
  const visibleImages = images.slice(0, IMAGE_PREVIEW);
  const remainingCount = images.length - IMAGE_PREVIEW;

  return (
    <>
      <Group gap={4} align="center">
        {visibleImages && visibleImages.map((src, i) => (
          <Tooltip key={i} label="Nhấn để xem tất cả" position="top">
            <img
              src={src}
              alt={`${alt} ${i + 1}`}
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => setOpened(true)}
            />
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Button size="xs" variant="light" onClick={() => setOpened(true)}>
            +{remainingCount} more
          </Button>
        )}
      </Group>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={alt}
        centered
        size="65vw"
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        <Group gap="md" justify="center" wrap="wrap">
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${alt} ${i + 1}`}
              style={{ maxWidth: 280, maxHeight: 280, borderRadius: 8, objectFit: 'contain' }}
            />
          ))}
        </Group>
      </Modal>
    </>
  )
}

interface UVariantIdInputProps {
  
  value: string
  onChange: (val: string) => void
}

const VariantIdInput = ({ value, onChange }: UVariantIdInputProps) => {
  //let value = getValue() || '';
  //const [valueInput, setValueInput] = useState(value);
  return (
    <TextInput
      size="xs"
      styles={{ input: { fontSize: '11px', height: 24, minHeight: 24 } }}
      // onChange={e => setValueInput(e.currentTarget.value)}
      // value={valueInput as string}
      // onBlur={e => onUpdateItem(row.original.originalIndex, { variantId: valueInput })}
      value={value}
      onChange={e => onChange(e.currentTarget.value)}
      style={{ width: 180, flexShrink: 0 }}
    />
  )
}

export const OrdersTable = ({ items, checked, onToggleChecked, onUpdateItem }: OrdersTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([])

  // Frozen sort order — only recomputed when a new CSV is imported (items.length changes).
  // This prevents rows from jumping around while the user edits inputs.
  const frozenOrderRef = useRef<number[]>([])
  const prevLengthRef = useRef(-1)

  if (items.length !== prevLengthRef.current) {
    prevLengthRef.current = items.length
    const indexed = items.map((item, i) => ({ item, i }))
    //indexed.sort((a, b) => STATUS_SORT_ORDER[getRowStatus(a.item)] - STATUS_SORT_ORDER[getRowStatus(b.item)])
    frozenOrderRef.current = indexed.map(x => x.i)
  }

  const data = useMemo<RowData[]>(
    () => frozenOrderRef.current.map(i => ({ ...items[i], originalIndex: i })),
    [items]
  );

  const styleSelectOptions = [
    { value: 'comfort_c1717', label: 'Comfort Colors - C1717' },
    { value: 'gildan_g5000', label: 'Gildan - G5000' },
  ];
  const columns = useMemo<ColumnDef<RowData>[]>(() => [
    {
      id: 'isSelected',
      header: '',
      size: 40,
      cell: ({ row }: { row: any }) => {
        const status = getRowStatus(row.original)
        const isLocked = status === 'locked';
        let isSelected = row.original.isSelected;
        return (
          <Checkbox
            checked={isSelected}
            disabled={isLocked}
            onChange={() => {
              onUpdateItem(row.original.originalIndex, { isSelected: !isSelected });
            }}
          />
        )
      },
    },
    {
      accessorKey: 'orderDate',
      header: 'Date',
      size: 50,
    },
    {
      accessorKey: 'orderId',
      header: 'Order ID',
      size: 100,
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      size: 140,
    },
    {
      accessorKey: 'productName',
      header: 'Product Name',
      size: 350,
    },
    {
      accessorKey: 'variation',
      header: 'Product',
      size: 100,
    },
    {
      accessorKey: 'style',
      header: 'Style',
      size: 150,
      cell: ({ row, getValue }: { row: any, getValue: any }) => {
        let value = getValue() || '';
        return (
          <Select 
            size="xs"
            data={styleSelectOptions}
            value={value}
            onChange={(_value, option) => onUpdateItem(row.original.originalIndex, { style: option?.value })}
          />
        )
      },
    },
    {
      accessorKey: 'variantId',
      header: 'Variant ID',
      size: 90,
      
      cell: ({ row, getValue }: { row: any, getValue: any }) => {
        let value = getValue() || '';
        const [valueInput, setValueInput] = useState(value);
        return (
          <TextInput
            size="xs"
            styles={{ input: { fontSize: '11px', height: 24, minHeight: 24 } }}
            onChange={e => setValueInput(e.currentTarget.value)}
            value={valueInput as string}
            onBlur={e => onUpdateItem(row.original.originalIndex, { variantId: valueInput })}
            style={{ width: 90, flexShrink: 0 }}
          />
        )
      },
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      size: 50,
    },
    {
      id: 'status',
      header: 'Status',
      size: 140,
      cell: ({ row }: { row: any }) => {
        const s = getRowStatus(row.original)
        const { color, label } = STATUS_BADGE[s]
        return <Badge color={color} variant="light" size="xs">{label}</Badge>
      },
    },
  ], [items, checked, onToggleChecked])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (items.length === 0) return null

  return (
    <Box style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id} style={{ borderBottom: '2px solid var(--mantine-color-gray-3)' }}>
              {hg.headers.map(header => (
                <th
                  key={header.id}
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    width: header.getSize(),
                    whiteSpace: 'nowrap',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'var(--mantine-color-gray-0)',
                  }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {(() => {
            const orderColorMap = buildOrderColorMap(items)
            return table.getRowModel().rows.map(row => {
              const status = getRowStatus(row.original)
              const bg = getRowBg(row.original, orderColorMap)
              return (
                <React.Fragment key={row.id}>
                  {/* Row 1 — order info */}
                  <tr
                    key={`${row.id}-info`}
                    style={{ background: bg, borderBottom: '1px solid var(--mantine-color-gray-2)' }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.column.id} style={{ padding: '5px 8px 3px', fontSize: '11px' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {/* Row 2 — link label + design/mockup URL inputs with image previews */}
                  <tr
                    key={`${row.id}-design`}
                    style={{ background: bg, borderBottom: '2px solid var(--mantine-color-gray-3)' }}
                  >
                    <td />
                    <td>
                      { row?.original?.mainImageUrl?.length && row?.original?.mainImageUrl?.length > 0 ? (
                        <MainImagePreview images={row.original.mainImageUrl ?? []} alt={row.original.productName} />
                      ) : (
                        <span>No Image Available</span>
                      )}
                    </td>

                    <td colSpan={8} style={{ padding: '4px 8px 10px' }}>
                      <Stack gap={8}>
                        {/* Link Label */}
                        <UrlField
                          label="Link Label"
                          value={row.original.linkLabel}
                          showPreview={false}
                          onChange={val => onUpdateItem(row.original.originalIndex, { linkLabel: val })}
                        />
                        {/* All 4 design/mockup fields on one row */}
                        <UrlQuad items={[
                          { label: 'Design Front', value: row.original.designFront, onChange: (val: string) => onUpdateItem(row.original.originalIndex, { designFront: val }) },
                          { label: 'Design Back',  value: row.original.designBack,  onChange: (val: string) => onUpdateItem(row.original.originalIndex, { designBack:  val }) },
                          { label: 'Mockup Front', value: row.original.mockupFront, onChange: (val: string) => onUpdateItem(row.original.originalIndex, { mockupFront: val }) },
                          { label: 'Mockup Back',  value: row.original.mockupBack,  onChange: (val: string) => onUpdateItem(row.original.originalIndex, { mockupBack:  val }) },
                        ]} />
                      </Stack>
                    </td>
                  </tr>
                </React.Fragment>
              )
            })
          })()}
        </tbody>
      </table>
    </Box>
  )
}
