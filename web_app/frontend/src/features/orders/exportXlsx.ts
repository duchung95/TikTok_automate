import ExcelJS from 'exceljs'
import type { OrderItem } from './types'

/**
 * All 37 columns — must match FlashShip's import template exactly.
 * Columns not populated from TikTok data are left as empty string "".
 */
export const FLASHSHIP_COLUMNS = [
  'Order ID', 'Shipping method', "Customer's name", 'Email', 'Phone',
  'Country', 'State', 'Address line 1', 'Address line 2', 'City', 'Zip',
  'Link Label', 'Quantity', 'Variant ID',
  'Design front', 'Design back',
  'Design Left Hand', 'Design Right Hand', 'Design Neck', 'Design Hood',
  'Design Pocket', 'Design Neck Label Inner', 'Special Print',
  'Front Extra Large', 'Back Extra Large', 'Left Extra Large', 'Right Extra Large',
  'Mockup Front', 'Mockup Back', 'Mockup Left Hand', 'Mockup Right Hand',
  'Mockup Neck', 'Mockup Hood', 'Mockup Pocket', 'Mockup Neck Label Inner',
  'Product Note', 'DTF/DTG', 'Card Code',
] as const

export type FlashshipColumn = (typeof FLASHSHIP_COLUMNS)[number]

/**
 * Builds a FlashShip import row for a single order item.
 * Every column defaults to "" first, then known fields are filled in —
 * matching the Python app's build_flashship_row exactly.
 */
export function buildFlashshipRow(item: OrderItem): Record<FlashshipColumn, string | number> {
  const row = Object.fromEntries(
    FLASHSHIP_COLUMNS.map(col => [col, ''])
  ) as Record<FlashshipColumn, string | number>

  row['Order ID']        = 'HD - ' + item.orderId
  row['Shipping method'] = '1'
  row["Customer's name"] = item.customer
  row['Phone']           = item.phone
  row['Country']         = 'US'
  row['State']           = item.state
  row['Address line 1']  = item.address1
  row['Address line 2']  = item.address2
  row['City']            = item.city
  row['Zip']             = item.zip
  row['Link Label']      = item.linkLabel
  row['Quantity']        = item.quantity
  row['Variant ID']      = item.variantId
  row['Design front']    = item.designFront
  row['Design back']     = item.designBack
  row['Mockup Front']    = item.mockupFront
  row['Mockup Back']     = item.mockupBack
  row['DTF/DTG']         = '3'

  // When Link Label is provided, FlashShip resolves the address from their
  // saved addresses — clear the address fields to avoid redundancy/confusion.
  if (item.linkLabel.trim()) {
    row['Phone']          = ''
    row['State']          = ''
    row['Address line 1'] = ''
    row['Address line 2'] = ''
    row['City']           = ''
    row['Zip']            = ''
  }

  return row
}

/**
 * Checks whether the selection would create a partial-order violation.
 * A violation occurs when only SOME (not all) exportable items from
 * the same order are selected.
 * Returns a list of human-readable violation messages, empty if safe.
 */
export function getPartialExportViolations(
  items: OrderItem[],
  checkedIndices: Set<number>
): string[] {
  // Group exportable items by orderId
  const exportableByOrder = new Map<string, number[]>()
  items.forEach((item, i) => {
    
    const list = exportableByOrder.get(item.orderId) ?? []
    list.push(i)
    exportableByOrder.set(item.orderId, list)
    
  })

  const violations: string[] = []
  for (const [orderId, exportableIndices] of exportableByOrder) {
    const checkedCount = exportableIndices.filter(i => checkedIndices.has(i)).length
    if (checkedCount > 0 && checkedCount < exportableIndices.length) {
      const customer = items[exportableIndices[0]].customer || orderId
      violations.push(
        `${customer} (${orderId}) — đã chọn ${checkedCount}/${exportableIndices.length} sản phẩm`
      )
    }
  }
  return violations
}

/**
 * Builds and downloads the FlashShip XLSX import file from the given items.
 * Only items whose index is in `checkedIndices` are included.
 */
export const exportToXlsx = async (
  items: OrderItem[],
  checkedIndices: Set<number>
): Promise<void> => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('FlashShip')

  // Header row
  sheet.addRow(FLASHSHIP_COLUMNS as unknown as string[])

  // Data rows
  items.forEach((item, i) => {
    if (!checkedIndices.has(i)) return
    const row = buildFlashshipRow(item)
    sheet.addRow(FLASHSHIP_COLUMNS.map(col => row[col] ?? ''))
  })

  // Auto-fit column widths based on header length
  sheet.columns.forEach((col, i) => {
    col.width = Math.max(FLASHSHIP_COLUMNS[i].length + 4, 14)
  })

  // Native blob download — no extra dependency needed
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `flashship_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
};
