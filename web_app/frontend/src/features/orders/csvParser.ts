import type { OrderItem } from './types';

const CANCELLED_STATUSES = new Set([
  'Cancelled', 'Seller Cancel', 'Cancel Request', 'Unpaid',
])
const VOUCHER_PREFIX = 'Spend $'
const SHIP_STATUS = 'To ship'
const VOUCHER_PREFIX_PRODUCT_NAME = 'Voucher'

export const parseOrderDate = (dateStr: string): string => {
  // Input: "05/20/2026 7:43:26 PM" → Output: "2026-05-20"
  const match = dateStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return ''
  const [, month, day, year] = match
  // return `${year}-${month}-${day}`
  return `${day}/${month}/${year}`;
};

export const shouldSkipRow = (row: Record<string, string>): boolean => {
  const status = (row['Order Status'] ?? '').trim()
  const variation = (row['Variation'] ?? '').trim()
  const productName = (row['Product Name'] ?? '').trim()
  if (CANCELLED_STATUSES.has(status)) return true
  if (variation.startsWith(VOUCHER_PREFIX)) return true
  if (status !== SHIP_STATUS) return true
  if (productName.startsWith(VOUCHER_PREFIX_PRODUCT_NAME)) return true
  return false
}

export const mapVariant = (
  variation: string,
  mapping: Record<string, string>,
  colorFix: Record<string, string> = {},
  sizeFix: Record<string, string> = {},
): { fixedVariation: string; variantId: string } => {
  const normalised = variation.trim().replace(/\s+/g, ' ')
  const parts = normalised.split(',').map(p => p.trim())
  let fixed: string
  if (parts.length === 2) {
    const color = colorFix[parts[0]] ?? parts[0]
    const size  = sizeFix[parts[1]]  ?? parts[1]
    fixed = `${color}, ${size}`
  } else {
    fixed = normalised
  }
  const variantId = mapping[fixed] ?? ''
  return { fixedVariation: fixed, variantId }
}

export const parseCsvRows = (
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  colorFix: Record<string, string> = {},
  sizeFix: Record<string, string> = {},
  imageMapping: Record<string, string[]> = {},
): OrderItem[] => {
  const parseDate = (dateString: string) => {
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };
  return rows
    .filter(row => !shouldSkipRow(row))
    .map(row => {
      const variation = (row['Variation'] ?? '').trim()
      const { fixedVariation, variantId } = mapVariant(variation, mapping, colorFix, sizeFix);
      const productName = (row['Product Name'] ?? '').trim()
        .replace('- HnhDessign Clothing', '')
        .replace(' - HnhDessign Clothing', '')
        .replace('- Hnh Design Apperal', '')
        .replace(' - Hnh Design Apperal', '')
        .replace(/,$/, "")
        .trimEnd();
      const mainImage = imageMapping[productName]
      return {
        orderId:       (row['Order ID'] ?? '').trim(),
        orderDate:     parseOrderDate(row['Created Time'] ?? ''),
        customer:      (row['Recipient'] ?? '').trim(),
        variation,
        fixedVariation,
        variantId,
        quantity:      parseInt(row['Quantity'] ?? '1', 10) || 1,
        phone:         (row['Phone #'] ?? '').trim(),
        state:         (row['State'] ?? '').trim(),
        address1:      (row['Address Line 1'] ?? '').trim(),
        address2:      (row['Address Line 2'] ?? '').trim(),
        city:          (row['City'] ?? '').trim(),
        zip:           (row['Zipcode'] ?? '').trim(),
        linkLabel:     '',
        designFront:   '',
        designBack:    '',
        mockupFront:   '',
        mockupBack:    '',
        statusNote:    variantId ? '' : 'Variant ID not found',
        isPartialLock: false,
        productName:   (row['Product Name'] ?? '').trim(),
        mainImageUrl:      imageMapping[productName] ?? ''
      }
    })
    .sort((a, b) => parseDate(b.orderDate).getTime() - parseDate(a.orderDate).getTime())
    //.sort((a, b) => b.orderDate.localeCompare(a.orderDate))
};

export const markPartialOrders = (items: OrderItem[]): OrderItem[] => {
  const orderGroups = new Map<string, OrderItem[]>()
  for (const item of items) {
    const group = orderGroups.get(item.orderId) ?? []
    group.push(item)
    orderGroups.set(item.orderId, group)
  }
  return items.map(item => {
    const group = orderGroups.get(item.orderId)!
    const hasLocked = group.some(i => !i.variantId)
    const hasUnlocked = group.some(i => i.variantId)
    const isPartialLock = group.length > 1 && hasLocked && hasUnlocked && !item.variantId
    return { ...item, isPartialLock }
  });
};

/**
 * A row is "ready" (exportable / submittable) when:
 *   - it has a resolved variantId and is not a partial lock
 *   - linkLabel is non-empty
 *   - at least one of designFront or designBack is non-empty
 *   - at least one of mockupFront or mockupBack is non-empty
 */
export const isRowReady = (item: OrderItem): boolean => {
  if (!item.variantId || item.isPartialLock) return false
  if (!item.linkLabel.trim()) return false
  if (!item.designFront.trim() && !item.designBack.trim()) return false
  if (!item.mockupFront.trim() && !item.mockupBack.trim()) return false
  return true
};
