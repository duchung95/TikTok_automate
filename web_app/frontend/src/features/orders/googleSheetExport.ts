import type { OrderItem } from './types'
import { buildFlashshipRow, FLASHSHIP_COLUMNS } from './exportXlsx'
import { GOOGLE_SHEET_FULLFILL_ID } from '../../config'

const SHEET_ID = GOOGLE_SHEET_FULLFILL_ID
const SHEET_NAME = 'Sheet1'
const GSHEET_API = 'https://sheets.googleapis.com/v4/spreadsheets'

// Extra columns appended after the 37 FlashShip columns
const EXTRA_COLUMNS = ['Order Date/Time'] as const

export const GSHEET_COLUMNS = [...FLASHSHIP_COLUMNS, ...EXTRA_COLUMNS] as const

// ── Token storage ────────────────────────────────────────────────────────────

const TOKEN_KEY = 'google_access_token'

export function saveAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isSignedIn(): boolean {
  return !!getAccessToken()
}

// ── Sheet helpers ────────────────────────────────────────────────────────────

async function fetchExistingOrderIds(token: string): Promise<{ ids: Set<string>; totalRows: number }> {
  // Read only the Order ID column (column A) to minimise data transfer
  const range = encodeURIComponent(`${SHEET_NAME}!A:A`)
  const res = await fetch(`${GSHEET_API}/${SHEET_ID}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Google Sheets API error: ${res.status}`)
  }

  const data = await res.json()
  const rows: string[][] = data.values ?? []
  // Skip header row (index 0)
  const ids = new Set(rows.slice(1).map(r => r[0] ?? '').filter(Boolean))
  return { ids, totalRows: rows.length }
}

function buildGsheetRow(item: OrderItem): string[] {
  const flashshipRow = buildFlashshipRow(item)
  const flashshipValues = FLASHSHIP_COLUMNS.map(col => String(flashshipRow[col] ?? ''))
  return [...flashshipValues, item.orderDate]
}

// ── Duplicate detection result ───────────────────────────────────────────────

export interface DuplicateCheckResult {
  duplicateOrderIds: string[]
  newItems: OrderItem[]
  duplicateItems: OrderItem[]
}

export function checkDuplicates(items: OrderItem[], existingIds: Set<string>): DuplicateCheckResult {
  const duplicateItems = items.filter(item => existingIds.has('HD - ' + item.orderId))
  const newItems = items.filter(item => !existingIds.has('HD - ' + item.orderId))
  const duplicateOrderIds = [...new Set(duplicateItems.map(item => item.orderId))]
  return { duplicateOrderIds, newItems, duplicateItems }
}

// ── Append rows ──────────────────────────────────────────────────────────────

async function appendRows(token: string, rows: string[][]): Promise<void> {
  const range = encodeURIComponent(`${SHEET_NAME}!A:A`)
  const res = await fetch(
    `${GSHEET_API}/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Google Sheets API error: ${res.status}`)
  }
}

async function overwriteRows(token: string, items: OrderItem[], existingIds: Set<string>, totalRows: number): Promise<void> {
  // For overwrite: append is simplest — delete existing matching rows first would require batchUpdate.
  // For now: we re-append duplicates as new rows (simpler, safe).
  // TODO: implement true overwrite via batchUpdate if needed.
  const rows = items.map(buildGsheetRow)
  await appendRows(token, rows)
}

// ── Main export function ─────────────────────────────────────────────────────

export type DuplicateResolution = 'skip' | 'overwrite' | 'cancel'

export interface AppendToSheetOptions {
  items: OrderItem[]
  checkedIndices: Set<number>
  onDuplicatesFound: (result: DuplicateCheckResult) => Promise<DuplicateResolution>
}

export async function appendToSheet({
  items,
  checkedIndices,
  onDuplicatesFound,
}: AppendToSheetOptions): Promise<{ appended: number }> {
  const token = getAccessToken()
  if (!token) throw new Error('Chưa đăng nhập Google. Vui lòng đăng nhập trong trang Cài đặt.')

  const selectedItems = items.filter((_, i) => checkedIndices.has(i))
  if (selectedItems.length === 0) throw new Error('Chưa chọn đơn hàng nào.')

  // 1. Read existing Order IDs from the sheet
  const { ids: existingIds, totalRows } = await fetchExistingOrderIds(token)

  // 2. Check for duplicates
  const duplicateCheck = checkDuplicates(selectedItems, existingIds)

  let itemsToAppend: OrderItem[] = selectedItems

  if (duplicateCheck.duplicateOrderIds.length > 0) {
    const resolution = await onDuplicatesFound(duplicateCheck)

    if (resolution === 'cancel') return { appended: 0 }

    if (resolution === 'skip') {
      itemsToAppend = duplicateCheck.newItems
    }
    // 'overwrite': append all (including duplicates)
  }

  if (itemsToAppend.length === 0) return { appended: 0 }

  // 3. Append rows
  const rows = itemsToAppend.map(buildGsheetRow)
  await appendRows(token, rows)

  return { appended: itemsToAppend.length }
}
