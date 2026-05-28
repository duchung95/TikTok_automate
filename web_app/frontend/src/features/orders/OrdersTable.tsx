import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Checkbox, Badge, Text, Box, Stack, Group, TextInput, Tooltip, Modal, Button } from '@mantine/core'
import type { OrderItem } from './types'
import { extractGdriveId, gdriveThumbnailUrl } from './gdriveUtils'
import { isRowReady } from './csvParser'

interface OrdersTableProps {
  items: OrderItem[]
  checked: Record<string, boolean>
  onToggleChecked: (rowKey: string) => void
  onUpdateItem: (index: number, patch: Partial<OrderItem>) => void
}

type RowStatus = 'locked' | 'partial' | 'needs-link-label' | 'needs-design' | 'needs-mockup' | 'ready'

export function getRowStatus(item: OrderItem): RowStatus {
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

function buildOrderColorMap(items: OrderItem[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of items) {
    if (!map.has(item.orderId)) {
      map.set(item.orderId, ORDER_PALETTE[map.size % ORDER_PALETTE.length])
    }
  }
  return map
}

function getRowBg(item: OrderItem, orderColorMap: Map<string, string>): string {
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

function UrlField({ label, value, onChange, showPreview = true }: UrlFieldProps) {
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
function GdriveImage({ href, thumbUrl, label }: { href: string; thumbUrl: string; label: string }) {
  const [attempt, setAttempt] = useState(0)
  const [hasFailed, setHasFailed] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Reset whenever a new URL is set
  useEffect(() => {
    setAttempt(0)
    setHasFailed(false)
  }, [thumbUrl])

  function handleError() {
    if (attempt < MAX_RETRIES) {
      setTimeout(() => setAttempt(a => a + 1), RETRY_DELAY_MS)
    } else {
      setHasFailed(true)
    }
  }

  if (hasFailed) {
    return <Box w={80} h={80} style={{ borderRadius: 4, background: 'var(--mantine-color-gray-2)' }} />
  }

  return (
    <>
      <Tooltip label="Click to preview" position="top">
        <img
          key={`${thumbUrl}-${attempt}`}
          src={thumbUrl}
          width={80}
          height={80}
          onError={handleError}
          onClick={() => setPreviewOpen(true)}
          style={{ borderRadius: 4, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
        />
      </Tooltip>

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
            src={thumbUrl}
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

function UrlQuad({ items }: { items: UrlQuadItem[] }) {
  return (
    <Group gap="md" align="flex-start">
      {items.map(({ label, value, onChange }) => {
        const thumbUrl = (() => {
          const id = extractGdriveId(value)
          return id ? gdriveThumbnailUrl(id, 400) : null
        })()
        return (
          <Stack key={label} gap={3}>
            <TextInput
              size="xs"
              styles={{ input: { fontSize: '11px', height: 24, minHeight: 24 } }}
              placeholder={label}
              value={value}
              onChange={e => onChange(e.currentTarget.value)}
              style={{ width: 180, flexShrink: 0 }}
            />
            <Group gap={4} align="center" style={{ width: 180 }}>
              <Text size="10px" c="dimmed" style={{ flex: 1, textAlign: 'center' }}>{label}</Text>
              {thumbUrl
                ? <GdriveImage href={value} thumbUrl={thumbUrl} label={label} />
                : <Box w={80} h={80} style={{ borderRadius: 4, background: 'var(--mantine-color-gray-2)' }} />
              }
            </Group>
          </Stack>
        )
      })}
    </Group>
  )
}

export function OrdersTable({ items, checked, onToggleChecked, onUpdateItem }: OrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  // Frozen sort order — only recomputed when a new CSV is imported (items.length changes).
  // This prevents rows from jumping around while the user edits inputs.
  const frozenOrderRef = useRef<number[]>([])
  const prevLengthRef = useRef(-1)

  if (items.length !== prevLengthRef.current) {
    prevLengthRef.current = items.length
    const indexed = items.map((item, i) => ({ item, i }))
    indexed.sort((a, b) => STATUS_SORT_ORDER[getRowStatus(a.item)] - STATUS_SORT_ORDER[getRowStatus(b.item)])
    frozenOrderRef.current = indexed.map(x => x.i)
  }

  const data = useMemo<RowData[]>(
    () => frozenOrderRef.current.map(i => ({ ...items[i], originalIndex: i })),
    [items]
  )

  const columns = useMemo<ColumnDef<RowData>[]>(() => [
    {
      id: 'select',
      header: '',
      size: 40,
      cell: ({ row }) => {
        const status = getRowStatus(row.original)
        const isLocked = status === 'locked' || status === 'partial'
        return (
          <Checkbox
            checked={!!checked[String(row.original.originalIndex)]}
            disabled={isLocked}
            onChange={() => onToggleChecked(String(row.original.originalIndex))}
          />
        )
      },
    },
    {
      accessorKey: 'orderDate',
      header: 'Date',
      size: 100,
    },
    {
      accessorKey: 'orderId',
      header: 'Order ID',
      size: 150,
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      size: 140,
    },
    {
      accessorKey: 'variation',
      header: 'Product',
      size: 200,
    },
    {
      accessorKey: 'variantId',
      header: 'Variant ID',
      size: 90,
      cell: ({ getValue }) => (
        <Text size="11px" c={getValue() ? undefined : 'red'}>
          {String(getValue() || '—')}
        </Text>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      size: 50,
    },
    // {
    //   accessorKey: 'address1',
    //   header: 'Address',
    //   size: 180,
    // },
    {
      id: 'status',
      header: 'Status',
      size: 140,
      cell: ({ row }) => {
        const s = getRowStatus(row.original)
        const { color, label } = STATUS_BADGE[s]
        return <Badge color={color} variant="light" size="xs">{label}</Badge>
      },
    },
  ], [checked, onToggleChecked])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

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
                <>
                  {/* Row 1 — order info */}
                  <tr
                    key={`${row.id}-info`}
                    style={{ background: bg, borderBottom: '1px solid var(--mantine-color-gray-2)' }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ padding: '5px 8px 3px', fontSize: '11px' }}>
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
                </>
              )
            })
          })()}
        </tbody>
      </table>
    </Box>
  )
}
