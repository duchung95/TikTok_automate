import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
import { Checkbox, Badge, Text, Box, Stack, Group, TextInput, Image, Tooltip } from '@mantine/core'
import type { OrderItem } from './types'
import { extractGdriveId, gdriveThumbnailUrl } from './gdriveUtils'
import { isRowReady } from './csvParser'

interface OrdersTableProps {
  items: OrderItem[]
  checked: Record<string, boolean>
  onToggleChecked: (rowKey: string) => void
  onUpdateItem: (index: number, patch: Partial<OrderItem>) => void
}

type RowStatus = 'locked' | 'partial' | 'needs-url' | 'ready'

function getRowStatus(item: OrderItem): RowStatus {
  if (!item.variantId && !item.isPartialLock) return 'locked'
  if (item.isPartialLock) return 'partial'
  if (!isRowReady(item)) return 'needs-url'
  return 'ready'
}

const STATUS_SORT_ORDER: Record<RowStatus, number> = {
  locked: 0,
  partial: 1,
  'needs-url': 2,
  ready: 3,
}

const STATUS_BADGE: Record<RowStatus, { color: string; label: string }> = {
  locked:      { color: 'red',    label: 'Missing Variant'  },
  partial:     { color: 'orange', label: 'Partial Order'    },
  'needs-url': { color: 'yellow', label: 'Needs Design URL' },
  ready:       { color: 'green',  label: 'Ready'            },
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

function UrlPair({ labelA, valueA, onChangeA, labelB, valueB, onChangeB }: UrlPairProps) {
  const thumbA = (() => { const id = extractGdriveId(valueA); return id ? gdriveThumbnailUrl(id, 400) : null })()
  const thumbB = (() => { const id = extractGdriveId(valueB); return id ? gdriveThumbnailUrl(id, 400) : null })()

  return (
    <Group gap="lg" align="flex-start">
      {/* Column A */}
      <Stack gap={3}>
        <Group gap={4} align="center">
          <Text size="11px" c="dimmed" w={90} style={{ flexShrink: 0 }}>{labelA}:</Text>
          <TextInput
            size="xs"
            styles={{ input: { fontSize: '11px', height: 24, minHeight: 24 } }}
            placeholder="Paste Google Drive URL…"
            value={valueA}
            onChange={e => onChangeA(e.currentTarget.value)}
            style={{ width: 280, flexShrink: 0 }}
          />
        </Group>
        <Box ml={94}>
          {thumbA ? (
            <Tooltip label="Click to open" position="top">
              <a href={valueA} target="_blank" rel="noreferrer">
                <Image src={thumbA} w={80} h={80} radius="sm" style={{ objectFit: 'cover' }} />
              </a>
            </Tooltip>
          ) : (
            <Box w={80} h={80} style={{ borderRadius: 4, background: 'var(--mantine-color-gray-2)' }} />
          )}
        </Box>
      </Stack>
      {/* Column B */}
      <Stack gap={3}>
        <Group gap={4} align="center">
          <Text size="11px" c="dimmed" w={90} style={{ flexShrink: 0 }}>{labelB}:</Text>
          <TextInput
            size="xs"
            styles={{ input: { fontSize: '11px', height: 24, minHeight: 24 } }}
            placeholder="Paste Google Drive URL…"
            value={valueB}
            onChange={e => onChangeB(e.currentTarget.value)}
            style={{ width: 280, flexShrink: 0 }}
          />
        </Group>
        <Box ml={94}>
          {thumbB ? (
            <Tooltip label="Click to open" position="top">
              <a href={valueB} target="_blank" rel="noreferrer">
                <Image src={thumbB} w={80} h={80} radius="sm" style={{ objectFit: 'cover' }} />
              </a>
            </Tooltip>
          ) : (
            <Box w={80} h={80} style={{ borderRadius: 4, background: 'var(--mantine-color-gray-2)' }} />
          )}
        </Box>
      </Stack>
    </Group>
  )
}

export function OrdersTable({ items, checked, onToggleChecked, onUpdateItem }: OrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const data = useMemo<RowData[]>(() => {
    const withIndex = items.map((item, originalIndex) => ({ ...item, originalIndex }))
    return [...withIndex].sort(
      (a, b) => STATUS_SORT_ORDER[getRowStatus(a)] - STATUS_SORT_ORDER[getRowStatus(b)]
    )
  }, [items])

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
    {
      accessorKey: 'address1',
      header: 'Address',
      size: 180,
    },
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
                        {/* Design Front + Back: inputs on same row, previews below each */}
                        <UrlPair
                          labelA="Design Front"
                          valueA={row.original.designFront}
                          onChangeA={val => onUpdateItem(row.original.originalIndex, { designFront: val })}
                          labelB="Design Back"
                          valueB={row.original.designBack}
                          onChangeB={val => onUpdateItem(row.original.originalIndex, { designBack: val })}
                        />
                        {/* Mockup Front + Back: inputs on same row, previews below each */}
                        <UrlPair
                          labelA="Mockup Front"
                          valueA={row.original.mockupFront}
                          onChangeA={val => onUpdateItem(row.original.originalIndex, { mockupFront: val })}
                          labelB="Mockup Back"
                          valueB={row.original.mockupBack}
                          onChangeB={val => onUpdateItem(row.original.originalIndex, { mockupBack: val })}
                        />
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
