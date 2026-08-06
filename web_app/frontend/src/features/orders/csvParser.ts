import type { OrderItem } from './types';

const CANCELLED_STATUSES = new Set([
  'Cancelled', 'Seller Cancel', 'Cancel Request', 'Unpaid', 'Canceled',
])
const VOUCHER_PREFIX = 'Spend $';
const SHIP_STATUS = 'To ship';
const SHIPPED = 'Shipped';
const VOUCHER_PREFIX_PRODUCT_NAME = 'Voucher';
const PENDING = 'Pending';

export const parseOrderDate = (dateStr: string): string => {
  // Input: "05/20/2026 7:43:26 PM" → Output: "2026-05-20"
  const match = dateStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return ''
  const [, month, day, year] = match
  // return `${year}-${month}-${day}`
  return `${day}/${month}/${year}`;
};

const parseCustomDate = (dateString: string) => {
  // 1. Separate Date and Time
  const [datePart, timePart, period] = dateString.split(' ');
  
  // 2. Extract Date components (MM/DD/YYYY)
  const [month, day, year] = datePart.split('/').map(Number);
  
  // 3. Extract Time components
  let [hours, minutes, seconds] = timePart.split(':').map(Number);
  
  // 4. Convert to 24-hour time
  if (period.toUpperCase() === 'PM' && hours < 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }
  
  // 5. Return a local Date object
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

export const shouldSkipRow = (row: Record<string, string>, getThisWeekOrders: boolean=false): boolean => {
  const status = (row['Order Status'] ?? '').trim()
  const variation = (row['Variation'] ?? '').trim()
  const productName = (row['Product Name'] ?? '').trim()
  if (CANCELLED_STATUSES.has(status)) return true
  if (status === SHIPPED) return true; // item already get shipped 
  if (status === PENDING) return true; // item is still pending
  if (variation.startsWith(VOUCHER_PREFIX)) return true
  if (status !== SHIP_STATUS && !getThisWeekOrders) return true 
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
  } else if (parts.length === 3) {
    // Format: "Breed, Size, Color" — breed is design-specific, ignored for variant mapping
    let size  = sizeFix[parts[1]]  ?? parts[1]
    let color = colorFix[parts[2]] ?? parts[2]
    fixed = `${color}, ${size}`
    if (!mapping[fixed]) {
      // When fixed variation is not found and when size is at the end 
      size  = sizeFix[parts[2]]  ?? parts[2];
      color = colorFix[parts[1]] ?? parts[1];
      fixed = `${color}, ${size}`;

      // When fixed variation is not found and when color is at the start 
      if (!mapping[fixed]) {
        size  = sizeFix[parts[1]]  ?? parts[1];
        color = colorFix[parts[0]] ?? parts[0];
        fixed = `${color}, ${size}`;
      }

    }
  } else {
    fixed = normalised
  }
  const variantId = mapping[fixed] ?? ''
  return { fixedVariation: fixed, variantId }
}

export const parseCsvRows = (
  rows: Record<string, string>[],
  mapping: Record<string, Record<string, string>>,
  colorFix: Record<string, string> = {},
  sizeFix: Record<string, string> = {},
  imageMapping: Record<string, string[]> = {},
  getThisWeekOrders: boolean = false,
): OrderItem[] => {
  const parseDate = (dateString: string) => {
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };
  return rows
    .filter(row => !shouldSkipRow(row, getThisWeekOrders))
    .filter(row => {
      if (!getThisWeekOrders) return true; // If not filtering for this week, include all rows
      const targetDate = parseCustomDate(row['Created Time']);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return targetDate.getTime() >= oneWeekAgo.getTime();
    })
    .map(row => {
      const variation = (row['Variation'] ?? '').trim();
      const productName = (row['Product Name'] ?? '').trim()
        .replace('- HnhDessign Clothing', '')
        .replace(' - HnhDessign Clothing', '')
        .replace('- Hnh Design Apperal', '')
        .replace(' - Hnh Design Apperal', '')
        .replace(/,$/, "")
        .replace(/\s+/g, ' ')
        .trimEnd();
      let style = '';
      let sub_mapping = {};
      if (productName.includes('Comfort Colors') || productName.includes('Comfort colors') || productName.includes('Comfort Color')) {
        sub_mapping = mapping['comfort_c1717'];
        style = 'comfort_c1717';
      } else if (productName.includes('Sweatshirt') || productName.includes('Sweatshirts') 
        || productName.includes('sweatshirt')) {
        sub_mapping = mapping['gildan_g18000'];
        style = 'gildan_g18000';
      } else if (productName.includes('Hoodie') || productName.includes('hoodie')) {
        sub_mapping = mapping['gildan_g18500'];
        style = 'gildan_g18500';
      }
      const { fixedVariation, variantId } = mapVariant(variation, sub_mapping, colorFix, sizeFix);
      
      const mainImage = imageMapping[productName]
      // Check whether the image exists
      if (!imageMapping[productName]) {
        console.log('IMAGE DOES NOT EXIST: ', JSON.stringify(productName))
      }
      return {
        isSelected:   false,
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
        mainImageUrl:   imageMapping[productName] ?? [],
        style,
        skuId: (row['SKU ID'] ?? '').trim(),

      }
    })
    .sort((a, b) => parseDate(a.orderDate).getTime() - parseDate(b.orderDate).getTime())
    //.sort((a, b) => b.orderDate.localeCompare(a.orderDate))
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
