import { describe, it, expect } from 'vitest'
import type { OrderItem } from './types'
import {
  parseOrderDate,
  shouldSkipRow,
  mapVariant,
  parseCsvRows,
  isRowReady,
} from './csvParser'

const MOCK_MAPPING: Record<string, string> = {
  'Black, M': '101',
  'White, L': '102',
};

const PARSE_CSV_MOCK_MAPPING: Record<string, Record<string, string>> = {
  'comfort_c1717': {
    'Black, M': '101',
    'White, L': '102',
  }
};

const makeRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
  'Order ID': 'ORD-001',
  'Created Time': '05/20/2026 7:43:26 PM',
  'Order Status': 'To ship',
  'Recipient': 'John Doe',
  'Variation': 'Black, M',
  'Quantity': '1',
  'Phone #': '1234567890',
  'State': 'California',
  'Address Line 1': '123 Main St',
  'Address Line 2': '',
  'City': 'Los Angeles',
  'Zipcode': '90001',
  ...overrides,
})

// ── parseOrderDate ────────────────────────────────────────────────────────────

describe('parseOrderDate', () => {
  it('parses MM/DD/YYYY HH:MM:SS PM format', () => {
    expect(parseOrderDate('05/20/2026 7:43:26 PM')).toBe('20/05/2026')
  })

  it('parses MM/DD/YYYY HH:MM:SS AM format', () => {
    expect(parseOrderDate('01/03/2026 9:00:00 AM')).toBe('03/01/2026')
  })

  it('returns empty string for empty input', () => {
    expect(parseOrderDate('')).toBe('')
  })

  it('returns empty string for invalid input', () => {
    expect(parseOrderDate('not-a-date')).toBe('')
  })
})

// ── shouldSkipRow ─────────────────────────────────────────────────────────────

describe('shouldSkipRow', () => {
  it('keeps To ship rows', () => {
    expect(shouldSkipRow(makeRow())).toBe(false)
  })

  it('skips Cancelled status', () => {
    expect(shouldSkipRow(makeRow({ 'Order Status': 'Cancelled' }))).toBe(true)
  })

  it('skips Seller Cancel status', () => {
    expect(shouldSkipRow(makeRow({ 'Order Status': 'Seller Cancel' }))).toBe(true)
  })

  it('skips Cancel Request status', () => {
    expect(shouldSkipRow(makeRow({ 'Order Status': 'Cancel Request' }))).toBe(true)
  })

  it('skips Unpaid status', () => {
    expect(shouldSkipRow(makeRow({ 'Order Status': 'Unpaid' }))).toBe(true)
  })

  it('skips Shipped status', () => {
    expect(shouldSkipRow(makeRow({ 'Order Status': 'Shipped' }))).toBe(true)
  })

  it('skips voucher rows by Variation column', () => {
    expect(shouldSkipRow(makeRow({ 'Variation': 'Spend $15, Get $1 Off Your Next Purchase, S, Red' }))).toBe(true)
  })
})

// ── mapVariant ────────────────────────────────────────────────────────────────

const MOCK_COLOR_FIX: Record<string, string> = {
  'Irovy': 'Ivory',
  'Crunchberry': 'Crunch Berry',
}
const MOCK_SIZE_FIX: Record<string, string> = {
  'XXL': '2XL',
}
const MOCK_MAPPING_WITH_ALIASES: Record<string, string> = {
  'Ivory, M': '201',
  'Crunch Berry, S': '202',
  'Black, 2XL': '203',
}

describe('mapVariant', () => {
  it('maps known variation to variant ID', () => {
    expect(mapVariant('Black, M', MOCK_MAPPING)).toEqual({
      fixedVariation: 'Black, M',
      variantId: '101',
    })
  })

  it('returns empty variantId for unknown variation', () => {
    expect(mapVariant('Purple, XL', MOCK_MAPPING)).toEqual({
      fixedVariation: 'Purple, XL',
      variantId: '',
    })
  })

  it('normalises extra whitespace before lookup', () => {
    expect(mapVariant('Black,  M', MOCK_MAPPING)).toEqual({
      fixedVariation: 'Black, M',
      variantId: '101',
    })
  })

  it('trims leading/trailing whitespace', () => {
    expect(mapVariant('  Black, M  ', MOCK_MAPPING)).toEqual({
      fixedVariation: 'Black, M',
      variantId: '101',
    })
  })

  it('accepts numeric variant IDs after stringification (as stored in the real JSON)', () => {
    const numericMapping = { 'Bay, M': '174353' }
    expect(mapVariant('Bay, M', numericMapping)).toEqual({
      fixedVariation: 'Bay, M',
      variantId: '174353',
    })
  })

  it('applies color_fix alias before lookup (e.g. Irovy → Ivory)', () => {
    expect(mapVariant('Irovy, M', MOCK_MAPPING_WITH_ALIASES, MOCK_COLOR_FIX, MOCK_SIZE_FIX)).toEqual({
      fixedVariation: 'Ivory, M',
      variantId: '201',
    })
  })

  it('applies color_fix alias for Crunchberry → Crunch Berry', () => {
    expect(mapVariant('Crunchberry, S', MOCK_MAPPING_WITH_ALIASES, MOCK_COLOR_FIX, MOCK_SIZE_FIX)).toEqual({
      fixedVariation: 'Crunch Berry, S',
      variantId: '202',
    })
  })

  it('applies size_fix alias before lookup (e.g. XXL → 2XL)', () => {
    expect(mapVariant('Black, XXL', MOCK_MAPPING_WITH_ALIASES, MOCK_COLOR_FIX, MOCK_SIZE_FIX)).toEqual({
      fixedVariation: 'Black, 2XL',
      variantId: '203',
    })
  })

  it('applies both color_fix and size_fix together', () => {
    const mapping = { 'Ivory, 2XL': '204' }
    expect(mapVariant('Irovy, XXL', mapping, MOCK_COLOR_FIX, MOCK_SIZE_FIX)).toEqual({
      fixedVariation: 'Ivory, 2XL',
      variantId: '204',
    })
  })

  it('leaves variation unchanged when no fix applies', () => {
    expect(mapVariant('Black, M', MOCK_MAPPING, MOCK_COLOR_FIX, MOCK_SIZE_FIX)).toEqual({
      fixedVariation: 'Black, M',
      variantId: '101',
    })
  })

  // ── 3-part format: "Breed, Size, Color" ──────────────────────────────────

  it('maps 3-part "Breed, Size, Color" format by ignoring breed', () => {
    const mapping = { 'Pepper, M': '790473' }
    expect(mapVariant('Golden Retriever, M, Pepper', mapping)).toEqual({
      fixedVariation: 'Pepper, M',
      variantId: '790473',
    })
  })

  it('maps 3-part format for a different breed with the same color/size', () => {
    const mapping = { 'Blue Jean, M': '171923' }
    expect(mapVariant('Labrador Retriever, M, Blue Jean', mapping)).toEqual({
      fixedVariation: 'Blue Jean, M',
      variantId: '171923',
    })
  })

  it('applies color_fix in 3-part format', () => {
    const mapping = { 'Ivory, M': '201' }
    expect(mapVariant('Golden Retriever, M, Irovy', mapping, MOCK_COLOR_FIX, MOCK_SIZE_FIX)).toEqual({
      fixedVariation: 'Ivory, M',
      variantId: '201',
    })
  })

  it('applies size_fix in 3-part format', () => {
    const mapping = { 'Pepper, 2XL': '790503' }
    expect(mapVariant('Golden Retriever, XXL, Pepper', mapping, MOCK_COLOR_FIX, MOCK_SIZE_FIX)).toEqual({
      fixedVariation: 'Pepper, 2XL',
      variantId: '790503',
    })
  })

  it('returns empty variantId for unknown color in 3-part format', () => {
    expect(mapVariant('Golden Retriever, M, UnknownColor', MOCK_MAPPING)).toEqual({
      fixedVariation: 'UnknownColor, M',
      variantId: '',
    })
  })
})

// ── parseCsvRows ──────────────────────────────────────────────────────────────

describe('parseCsvRows', () => {
  it('returns empty array for empty input', () => {
    expect(parseCsvRows([], PARSE_CSV_MOCK_MAPPING)).toEqual([]);
  })

  it('sorts results by orderDate descending (latest first)', () => {
    const rows = [
      makeRow({ 'Order ID': 'ORD-001', 'Created Time': '01/10/2026 9:00:00 AM' }),
      makeRow({ 'Order ID': 'ORD-002', 'Created Time': '03/15/2026 9:00:00 AM' }),
      makeRow({ 'Order ID': 'ORD-003', 'Created Time': '02/01/2026 9:00:00 AM' }),
    ]
    const result = parseCsvRows(rows, PARSE_CSV_MOCK_MAPPING)
    expect(result.map((r: OrderItem) => r.orderId)).toEqual(['ORD-002', 'ORD-003', 'ORD-001'])
  })

  it('filters out cancelled rows and keeps To ship rows', () => {
    const rows = [
      makeRow({ 'Order Status': 'Cancelled' }),
      makeRow({ 'Order ID': 'ORD-002' }),
    ]
    const result = parseCsvRows(rows, PARSE_CSV_MOCK_MAPPING)
    expect(result).toHaveLength(1)
    expect(result[0].orderId).toBe('ORD-002')
  })

  it('maps variant ID correctly', () => {
    const [item] = parseCsvRows([makeRow({'Product Name': 'Comfort Colors shirt'})], PARSE_CSV_MOCK_MAPPING)
    expect(item.variantId).toBe('101')
  })

  it('resolves variant ID from a mapping with stringified numeric values', () => {
    const realStyleMapping = {'comfort_c1717': { 'Black, M': '31001' }}
    const [item] = parseCsvRows([makeRow({ 'Variation': 'Black, M', 'Product Name': 'Comfort Colors shirt' })], realStyleMapping)
    expect(item.variantId).toBe('31001')
  })

  it('sets empty variantId and statusNote when variant not found', () => {
    const [item] = parseCsvRows([makeRow({ 'Variation': 'Unknown, XS', 'Product Name': 'cool shirt' })], PARSE_CSV_MOCK_MAPPING)
    expect(item.variantId).toBe('')
    expect(item.statusNote).toBe('Variant ID not found')
  })

  it('parses quantity as a number', () => {
    const [item] = parseCsvRows([makeRow({ 'Quantity': '3' })], PARSE_CSV_MOCK_MAPPING)
    expect(item.quantity).toBe(3)
  })

  it('defaults quantity to 1 when missing', () => {
    const [item] = parseCsvRows([makeRow({ 'Quantity': '' })], PARSE_CSV_MOCK_MAPPING)
    expect(item.quantity).toBe(1)
  })

  it('initialises all URL fields as empty strings', () => {
    const [item] = parseCsvRows([makeRow()], PARSE_CSV_MOCK_MAPPING)
    expect(item.linkLabel).toBe('')
    expect(item.designFront).toBe('')
    expect(item.designBack).toBe('')
    expect(item.mockupFront).toBe('')
    expect(item.mockupBack).toBe('')
  })

  it('initialises isPartialLock as false', () => {
    const [item] = parseCsvRows([makeRow()], PARSE_CSV_MOCK_MAPPING)
    expect(item.isPartialLock).toBe(false)
  });

  it('sorts results with mainImageUrl', () => {
    const rows = [
      makeRow({ 'Order ID': 'ORD-001', 'Created Time': '01/10/2026 9:00:00 AM', 'Product Name': 'T-Shirt' }),
    ]
    const imageMapping = { 'T-Shirt': ['https://example.com/tshirt.jpg'] }
    const result = parseCsvRows(rows, PARSE_CSV_MOCK_MAPPING, {}, {}, imageMapping)
    expect(result.map((r: OrderItem) => r.orderId)).toEqual(['ORD-001'])
    expect(result.map((r: OrderItem) => r.mainImageUrl)).toEqual([['https://example.com/tshirt.jpg']])
  });

  it('sorts results with mainImageUrl empty', () => {
    const rows = [
      makeRow({ 'Order ID': 'ORD-001', 'Created Time': '01/10/2026 9:00:00 AM', 'Product Name': 'T-Shirt- Hnh Design Apperal' }),
    ]
    const imageMapping = { 'T-Shirt cool': ['https://example.com/tshirt.jpg'] };
    const result = parseCsvRows(rows, PARSE_CSV_MOCK_MAPPING, {}, {}, imageMapping);
    expect(result.map((r: OrderItem) => r.orderId)).toEqual(['ORD-001']);
    expect(result.map((r: OrderItem) => r.mainImageUrl)).toEqual([[]]);
  });

  it('sorts results with mainImageUrl with replace name', () => {
    const rows = [
      makeRow({ 'Order ID': 'ORD-001', 'Created Time': '01/10/2026 9:00:00 AM', 'Product Name': 'T-Shirt - Hnh Design Apperal' }),
    ]
    const imageMapping = { 'T-Shirt': ['https://example.com/tshirt.jpg'] }
    const result = parseCsvRows(rows, PARSE_CSV_MOCK_MAPPING, {}, {}, imageMapping)
    expect(result.map((r: OrderItem) => r.orderId)).toEqual(['ORD-001'])
    expect(result.map((r: OrderItem) => r.mainImageUrl)).toEqual([['https://example.com/tshirt.jpg']])
  });

  it('sorts results with mainImageUrl with replace name 2', () => {
    const rows = [
      makeRow({ 'Order ID': 'ORD-001', 'Created Time': '01/10/2026 9:00:00 AM', 'Product Name': 'T-Shirt- Hnh Design Apperal' }),
    ]
    const imageMapping = { 'T-Shirt': ['https://example.com/tshirt.jpg'] }
    const result = parseCsvRows(rows, PARSE_CSV_MOCK_MAPPING, {}, {}, imageMapping)
    expect(result.map((r: OrderItem) => r.orderId)).toEqual(['ORD-001'])
    expect(result.map((r: OrderItem) => r.mainImageUrl)).toEqual([['https://example.com/tshirt.jpg']])
  });

  it('sorts results with mainImageUrl with replace name 3', () => {
    const rows = [
      makeRow({ 'Order ID': 'ORD-001', 'Created Time': '01/10/2026 9:00:00 AM', 'Product Name': 'T-Shirt - HnhDessign Clothing' }),
    ]
    const imageMapping = { 'T-Shirt': ['https://example.com/tshirt.jpg'] }
    const result = parseCsvRows(rows, PARSE_CSV_MOCK_MAPPING, {}, {}, imageMapping)
    expect(result.map((r: OrderItem) => r.orderId)).toEqual(['ORD-001'])
    expect(result.map((r: OrderItem) => r.mainImageUrl)).toEqual([['https://example.com/tshirt.jpg']])
  });

  it('sorts results with mainImageUrl with replace name with more than 1 image', () => {
    const rows = [
      makeRow({ 'Order ID': 'ORD-001', 'Created Time': '01/10/2026 9:00:00 AM', 'Product Name': 'T-Shirt - HnhDessign Clothing' }),
    ]
    const imageMapping = { 'T-Shirt': ['https://example.com/tshirt.jpg', 'https://example.com/tshirt2.jpg'] }
    const result = parseCsvRows(rows, PARSE_CSV_MOCK_MAPPING, {}, {}, imageMapping)
    expect(result.map((r: OrderItem) => r.orderId)).toEqual(['ORD-001'])
    expect(result.map((r: OrderItem) => r.mainImageUrl)).toEqual([['https://example.com/tshirt.jpg', 'https://example.com/tshirt2.jpg']])
  });
});

// ── isRowReady ────────────────────────────────────────────────────────────────

const makeItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  isSelected:   false,
  orderId:       'ORD-001',
  orderDate:     '2026-05-20',
  customer:      'John Doe',
  variation:     'Black, M',
  fixedVariation:'Black, M',
  variantId:     '101',
  quantity:      1,
  phone:         '1234567890',
  state:         'California',
  address1:      '123 Main St',
  address2:      '',
  city:          'Los Angeles',
  zip:           '90001',
  linkLabel:     'MY-LABEL',
  designFront:   'https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuV/view',
  designBack:    '',
  mockupFront:   'https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuV/view',
  mockupBack:    '',
  statusNote:    '',
  isPartialLock: false,
  productName:   'T-Shirt',
  style: 'comfort_c1717',
  ...overrides,
})

describe('isRowReady', () => {
  it('returns true when all required fields are present', () => {
    expect(isRowReady(makeItem())).toBe(true)
  })

  it('returns false when variantId is missing', () => {
    expect(isRowReady(makeItem({ variantId: '' }))).toBe(false)
  })

  it('returns false when isPartialLock is true', () => {
    expect(isRowReady(makeItem({ isPartialLock: true }))).toBe(false)
  })

  it('returns false when linkLabel is empty', () => {
    expect(isRowReady(makeItem({ linkLabel: '' }))).toBe(false)
  })

  it('returns false when both designFront and designBack are empty', () => {
    expect(isRowReady(makeItem({ designFront: '', designBack: '' }))).toBe(false)
  })

  it('returns true when only designBack is set (designFront empty)', () => {
    expect(isRowReady(makeItem({ designFront: '', designBack: 'https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuV/view' }))).toBe(true)
  })

  it('returns false when both mockupFront and mockupBack are empty', () => {
    expect(isRowReady(makeItem({ mockupFront: '', mockupBack: '' }))).toBe(false)
  })

  it('returns true when only mockupBack is set (mockupFront empty)', () => {
    expect(isRowReady(makeItem({ mockupFront: '', mockupBack: 'https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuV/view' }))).toBe(true)
  })
})
