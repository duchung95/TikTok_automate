import type { OrderItem } from './types'
import { buildFlashshipRow, FLASHSHIP_COLUMNS } from './exportXlsx'
import { GOOGLE_SHEET_FULLFILL_ID, GOOGLE_SHEET_DESIGN_ID, GOOGLE_SHEET_DESIGN_SHEET_NAME } from '../../config'

const SHEET_ID = GOOGLE_SHEET_FULLFILL_ID
const SHEET_NAME = 'Sheet1'
const DESIGN_SHEET_ID = GOOGLE_SHEET_DESIGN_ID
const DESIGN_SHEET_NAME = GOOGLE_SHEET_DESIGN_SHEET_NAME
const GSHEET_API = 'https://sheets.googleapis.com/v4/spreadsheets'

export const GSHEET_COLUMNS = [
  'Order ID',
  'Order Date',
  'Shipping method',
  "Customer's name",
  'Email',
  'Phone',
  'Country',
  'State',
  'Address line 1',
  'Address line 2',
  'City',
  'Zip',
  'Link Label',
  'Quantity',
  'Variant ID',
  'Design front',
  'Design back',
  'Design Left Hand',
  'Design Right Hand',
  'Design Neck',
  'Design Hood',
  'Design Pocket',
  'Design Neck Label Inner',
  'Special Print',
  'Front Extra Large',
  'Back Extra Large',
  'Left Extra Large',
  'Right Extra Large',
  'Mockup Front',
  'Mockup Back',
  'Mockup Left Hand',
  'Mockup Right Hand',
  'Mockup Neck',
  'Mockup Hood',
  'Mockup Pocket',
  'Mockup Neck Label Inner',
  'Product Note',
  'DTF/DTG',
  'Card Code',
] as const;

// ── Token storage ────────────────────────────────────────────────────────────

const TOKEN_KEY = 'google_access_token'

export const saveAccessToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const clearAccessToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}

export const isSignedIn = (): boolean => {
  return !!getAccessToken()
}

// ── Sheet helpers ────────────────────────────────────────────────────────────

const fetchExistingOrderIds = async (token: string): Promise<{ ids: Set<string>; totalRows: number }> => {
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

const buildGsheetRow = (item: OrderItem): string[] => {
  return [
    `HD - ${item.orderId}`,
    item.orderDate ?? '',
    item.productName ?? '',
    '', // Shipping method
    item.customer ?? '',
    '', // Email
    item.phone ?? '',
    '', // Country
    item.state ?? '',
    item.address1 ?? '',
    item.address2 ?? '',
    item.city ?? '',
    item.zip ?? '',
    item.linkLabel ?? '',
    String(item.quantity ?? ''),
    item.variantId ?? '',
    item.designFront ?? '',
    item.designBack ?? '',
    '', // Design Left Hand
    '', // Design Right Hand
    '', // Design Neck
    '', // Design Hood
    '', // Design Pocket
    '', // Design Neck Label Inner
    '', // Special Print
    '', // Front Extra Large
    '', // Back Extra Large
    '', // Left Extra Large
    '', // Right Extra Large
    item.mockupFront ?? '',
    item.mockupBack ?? '',
    '', // Mockup Left Hand
    '', // Mockup Right Hand
    '', // Mockup Neck
    '', // Mockup Hood
    '', // Mockup Pocket
    '', // Mockup Neck Label Inner
    '', // Product Note
    '3', // DTF/DTG
    '', // Card Code
  ];
}

// ── Duplicate detection result ───────────────────────────────────────────────

export interface DuplicateCheckResult {
  duplicateOrderIds: string[]
  newItems: OrderItem[]
  duplicateItems: OrderItem[]
}

export const checkDuplicates = (items: OrderItem[], existingIds: Set<string>): DuplicateCheckResult => {
  const duplicateItems = items.filter(item => existingIds.has('HD - ' + item.orderId))
  const newItems = items.filter(item => !existingIds.has('HD - ' + item.orderId))
  const duplicateOrderIds = [...new Set(duplicateItems.map(item => item.orderId))]
  return { duplicateOrderIds, newItems, duplicateItems }
}

// ── Append rows ──────────────────────────────────────────────────────────────

const appendRows = async (token: string, rows: string[][]): Promise<void> => {
  const range = encodeURIComponent(`${SHEET_NAME}!A:A`);
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
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Google Sheets API error: ${res.status}`);
  } else {
    window.alert('Đã lưu vào Google Sheets thành công!');
  }

}

const overwriteRows = async (token: string, items: OrderItem[], existingIds: Set<string>, totalRows: number): Promise<void> => {
  // For overwrite: append is simplest — delete existing matching rows first would require batchUpdate.
  // For now: we re-append duplicates as new rows (simpler, safe).
  // TODO: implement true overwrite via batchUpdate if needed.
  const rows = items.map(buildGsheetRow);
  await appendRows(token, rows);
}

// ── Design sheet helpers ─────────────────────────────────────────────────────

/** Reads existing product names (col A) from the design sheet to avoid duplicates */
const fetchExistingDesignNames = async (token: string): Promise<Set<string>> => {
  if (!DESIGN_SHEET_ID) return new Set()
  const range = encodeURIComponent(`${DESIGN_SHEET_NAME}!A:A`)
  const res = await fetch(`${GSHEET_API}/${DESIGN_SHEET_ID}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return new Set()
  const data = await res.json()
  const rows: string[][] = data.values ?? []
  // Skip header row
  return new Set(rows.slice(1).map(r => r[0] ?? '').filter(Boolean))
}

/**
 * Builds a 5-value row for the design sheet:
 * [productName, designFront, '', mockupFront, '']
 * Columns C and E are left empty — the ARRAYFORMULA in the sheet handles image display.
 */
export const buildDesignRow = (item: OrderItem): string[] => [
  item.productName,
  item.designFront,
  '',
  item.mockupFront,
  '',
  item.designBack,
  '',
  item.mockupBack,
  ''
]

/**
 * Saves unique new designs to the design sheet.
 * Deduplicates by productName against existing sheet entries and within the current batch.
 * Returns { saved: 0 } silently if DESIGN_SHEET_ID is not configured.
 */
export const saveToDesignSheet = async (items: OrderItem[], token: string): Promise<{ saved: number }> => {
  if (!DESIGN_SHEET_ID) return { saved: 0 }

  const existingNames = await fetchExistingDesignNames(token)
  const seen = new Set<string>()
  const newDesigns = items.filter(item => {
    if (!item.productName) return false
    if (!item.designFront && !item.designBack) return false
    if (existingNames.has(item.productName)) return false
    if (seen.has(item.productName)) return false
    seen.add(item.productName)
    return true
  })

  if (newDesigns.length === 0) return { saved: 0 }

  const range = encodeURIComponent(`${DESIGN_SHEET_NAME}!A:A`)
  const res = await fetch(
    `${GSHEET_API}/${DESIGN_SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: newDesigns.map(buildDesignRow) }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Design sheet API error: ${res.status}`)
  }
  return { saved: newDesigns.length }
}

// ── Main export function ─────────────────────────────────────────────────────

export type DuplicateResolution = 'skip' | 'overwrite' | 'cancel'

export interface AppendToSheetOptions {
  items: OrderItem[]
  checkedIndices: Set<number>
  onDuplicatesFound: (result: DuplicateCheckResult) => Promise<DuplicateResolution>
}

export const appendToSheet = async ({
  items,
  checkedIndices,
  onDuplicatesFound,
}: AppendToSheetOptions): Promise<{ appended: number }> => {
  const token = getAccessToken()
  if (!token) throw new Error('Chưa đăng nhập Google. Vui lòng đăng nhập trong trang Cài đặt.')

  const selectedItems = items.filter((item, i) => item.isSelected)
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

  // 4. Save unique designs to design sheet (non-blocking — failure does not affect fulfillment save)
  try {
    await saveToDesignSheet(itemsToAppend, token)
  } catch (e) {
    console.warn('Design sheet save failed (non-critical):', e)
  }

  return { appended: itemsToAppend.length }
}
