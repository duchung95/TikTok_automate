import { describe, it, expect } from 'vitest'
import {
  FLASHSHIP_COLUMNS,
  buildFlashshipRow,
  getPartialExportViolations,
  type FlashshipColumn,
} from './exportXlsx'
import type { OrderItem } from './types'

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    orderId:        'ORD-001',
    orderDate:      '2026-05-20',
    customer:       'John Doe',
    variation:      'Black, M',
    fixedVariation: 'Black, M',
    variantId:      '174323',
    quantity:       1,
    phone:          '5551234567',
    state:          'CA',
    address1:       '123 Main St',
    address2:       '',
    city:           'Los Angeles',
    zip:            '90001',
    linkLabel:      'Black M hoodie',
    designFront:    'https://drive.google.com/file/d/abc123/view',
    designBack:     '',
    mockupFront:    'https://drive.google.com/file/d/def456/view',
    mockupBack:     '',
    statusNote:     '',
    isPartialLock:  false,
    productName:    'Hoodie',
    ...overrides,
  }
}

// ─── buildFlashshipRow ─────────────────────────────────────────────────────────

describe('buildFlashshipRow', () => {
  it('prefixes orderId with "HD - "', () => {
    const row = buildFlashshipRow(makeItem({ orderId: 'TT-9999' }))
    expect(row['Order ID']).toBe('HD - TT-9999')
  })

  it('always sets Shipping method to "1"', () => {
    const row = buildFlashshipRow(makeItem())
    expect(row['Shipping method']).toBe('1')
  })

  it('always sets DTF/DTG to "3"', () => {
    const row = buildFlashshipRow(makeItem())
    expect(row['DTF/DTG']).toBe('3')
  })

  it('always sets Country to "US"', () => {
    const row = buildFlashshipRow(makeItem())
    expect(row['Country']).toBe('US')
  })

  it('contains all 37 FLASHSHIP_COLUMNS as keys', () => {
    const row = buildFlashshipRow(makeItem())
    for (const col of FLASHSHIP_COLUMNS) {
      expect(row).toHaveProperty(col)
    }
    expect(Object.keys(row)).toHaveLength(FLASHSHIP_COLUMNS.length)
  })

  it('has no undefined values — every column is "" or a real value', () => {
    const row = buildFlashshipRow(makeItem())
    for (const col of FLASHSHIP_COLUMNS) {
      expect(row[col]).not.toBeUndefined()
    }
  })

  it('sets unmapped columns (Email, Design Left Hand, etc.) to empty string', () => {
    const row = buildFlashshipRow(makeItem())
    const unmappedColumns = [
      'Email', 'Design Left Hand', 'Design Right Hand', 'Design Neck',
      'Design Hood', 'Design Pocket', 'Design Neck Label Inner', 'Special Print',
      'Front Extra Large', 'Back Extra Large', 'Left Extra Large', 'Right Extra Large',
      'Mockup Left Hand', 'Mockup Right Hand', 'Mockup Neck', 'Mockup Hood',
      'Mockup Pocket', 'Mockup Neck Label Inner', 'Product Note', 'Card Code',
    ]
    for (const col of unmappedColumns) {
      expect(row[col as FlashshipColumn]).toBe('')
    }
  })

  it('clears address fields when linkLabel is provided', () => {
    const row = buildFlashshipRow(makeItem({ linkLabel: 'Black M hoodie' }))
    expect(row['Phone']).toBe('')
    expect(row['State']).toBe('')
    expect(row['Address line 1']).toBe('')
    expect(row['Address line 2']).toBe('')
    expect(row['City']).toBe('')
    expect(row['Zip']).toBe('')
    // Link Label itself is still set
    expect(row['Link Label']).toBe('Black M hoodie')
  })

  it('keeps address fields when linkLabel is empty', () => {
    const row = buildFlashshipRow(makeItem({
      linkLabel: '',
      phone:     '5551234567',
      state:     'CA',
      address1:  '123 Main St',
      address2:  'Apt 1',
      city:      'Los Angeles',
      zip:       '90001',
    }))
    expect(row['Phone']).toBe('5551234567')
    expect(row['State']).toBe('CA')
    expect(row['Address line 1']).toBe('123 Main St')
    expect(row['Address line 2']).toBe('Apt 1')
    expect(row['City']).toBe('Los Angeles')
    expect(row['Zip']).toBe('90001')
  })

  it('treats whitespace-only linkLabel as empty — keeps address fields', () => {
    const row = buildFlashshipRow(makeItem({ linkLabel: '   ', address1: '123 Main St' }))
    expect(row['Address line 1']).toBe('123 Main St')
  })

  it('maps all OrderItem fields to the correct columns', () => {
    const item = makeItem({
      orderId:     'TT-1234',
      customer:    'Jane Smith',
      phone:       '3105559999',
      state:       'NY',
      address1:    '456 Oak Ave',
      address2:    'Apt 2',
      city:        'New York',
      zip:         '10001',
      linkLabel:   '',
      variantId:   '999',
      quantity:    2,
      designFront: 'https://drive.google.com/front',
      designBack:  'https://drive.google.com/back',
      mockupFront: 'https://drive.google.com/mfront',
      mockupBack:  'https://drive.google.com/mback',
    })
    const row = buildFlashshipRow(item)
    expect(row['Order ID']).toBe('HD - TT-1234')
    expect(row["Customer's name"]).toBe('Jane Smith')
    expect(row['Phone']).toBe('3105559999')
    expect(row['State']).toBe('NY')
    expect(row['Address line 1']).toBe('456 Oak Ave')
    expect(row['Address line 2']).toBe('Apt 2')
    expect(row['City']).toBe('New York')
    expect(row['Zip']).toBe('10001')
    expect(row['Link Label']).toBe('')
    expect(row['Variant ID']).toBe('999')
    expect(row['Quantity']).toBe(2)
    expect(row['Design front']).toBe('https://drive.google.com/front')
    expect(row['Design back']).toBe('https://drive.google.com/back')
    expect(row['Mockup Front']).toBe('https://drive.google.com/mfront')
    expect(row['Mockup Back']).toBe('https://drive.google.com/mback')
  })
})

// ─── URL field isolation ───────────────────────────────────────────────────────
// Each URL field must map to exactly one column and never bleed into another.

describe('URL field isolation in buildFlashshipRow', () => {
  const URL_DESIGN_FRONT  = 'https://drive.google.com/file/d/DESIGN_FRONT/view'
  const URL_DESIGN_BACK   = 'https://drive.google.com/file/d/DESIGN_BACK/view'
  const URL_MOCKUP_FRONT  = 'https://drive.google.com/file/d/MOCKUP_FRONT/view'
  const URL_MOCKUP_BACK   = 'https://drive.google.com/file/d/MOCKUP_BACK/view'

  const URL_COLUMNS = ['Design front', 'Design back', 'Mockup Front', 'Mockup Back'] as const

  function rowWithAllUrls() {
    return buildFlashshipRow(makeItem({
      linkLabel:   'test-label',
      designFront: URL_DESIGN_FRONT,
      designBack:  URL_DESIGN_BACK,
      mockupFront: URL_MOCKUP_FRONT,
      mockupBack:  URL_MOCKUP_BACK,
    }))
  }

  it('Design Front URL appears only in "Design front" column', () => {
    const row = rowWithAllUrls()
    expect(row['Design front']).toBe(URL_DESIGN_FRONT)
    expect(row['Design back']).not.toBe(URL_DESIGN_FRONT)
    expect(row['Mockup Front']).not.toBe(URL_DESIGN_FRONT)
    expect(row['Mockup Back']).not.toBe(URL_DESIGN_FRONT)
  })

  it('Design Back URL appears only in "Design back" column', () => {
    const row = rowWithAllUrls()
    expect(row['Design back']).toBe(URL_DESIGN_BACK)
    expect(row['Design front']).not.toBe(URL_DESIGN_BACK)
    expect(row['Mockup Front']).not.toBe(URL_DESIGN_BACK)
    expect(row['Mockup Back']).not.toBe(URL_DESIGN_BACK)
  })

  it('Mockup Front URL appears only in "Mockup Front" column', () => {
    const row = rowWithAllUrls()
    expect(row['Mockup Front']).toBe(URL_MOCKUP_FRONT)
    expect(row['Design front']).not.toBe(URL_MOCKUP_FRONT)
    expect(row['Design back']).not.toBe(URL_MOCKUP_FRONT)
    expect(row['Mockup Back']).not.toBe(URL_MOCKUP_FRONT)
  })

  it('Mockup Back URL appears only in "Mockup Back" column', () => {
    const row = rowWithAllUrls()
    expect(row['Mockup Back']).toBe(URL_MOCKUP_BACK)
    expect(row['Design front']).not.toBe(URL_MOCKUP_BACK)
    expect(row['Design back']).not.toBe(URL_MOCKUP_BACK)
    expect(row['Mockup Front']).not.toBe(URL_MOCKUP_BACK)
  })

  it('each URL column has a distinct value — none are equal to each other', () => {
    const row = rowWithAllUrls()
    const values = URL_COLUMNS.map(col => row[col])
    const uniqueValues = new Set(values)
    expect(uniqueValues.size).toBe(URL_COLUMNS.length)
  })

  it('an empty designFront does not leak into designBack or mockup columns', () => {
    const row = buildFlashshipRow(makeItem({
      linkLabel:   'test-label',
      designFront: '',
      designBack:  URL_DESIGN_BACK,
      mockupFront: URL_MOCKUP_FRONT,
      mockupBack:  URL_MOCKUP_BACK,
    }))
    expect(row['Design front']).toBe('')
    expect(row['Design back']).toBe(URL_DESIGN_BACK)
    expect(row['Mockup Front']).toBe(URL_MOCKUP_FRONT)
    expect(row['Mockup Back']).toBe(URL_MOCKUP_BACK)
  })

  it('Link Label appears only in "Link Label" column — not in any URL column', () => {
    const row = buildFlashshipRow(makeItem({
      linkLabel:   'my-special-label',
      designFront: URL_DESIGN_FRONT,
      designBack:  URL_DESIGN_BACK,
      mockupFront: URL_MOCKUP_FRONT,
      mockupBack:  URL_MOCKUP_BACK,
    }))
    expect(row['Link Label']).toBe('my-special-label')
    expect(row['Design front']).not.toBe('my-special-label')
    expect(row['Design back']).not.toBe('my-special-label')
    expect(row['Mockup Front']).not.toBe('my-special-label')
    expect(row['Mockup Back']).not.toBe('my-special-label')
  })

  it('URL columns do not contain the Link Label value', () => {
    const row = buildFlashshipRow(makeItem({
      linkLabel:   'unique-link-label-value',
      designFront: URL_DESIGN_FRONT,
      designBack:  URL_DESIGN_BACK,
      mockupFront: URL_MOCKUP_FRONT,
      mockupBack:  URL_MOCKUP_BACK,
    }))
    for (const col of URL_COLUMNS) {
      expect(row[col]).not.toBe('unique-link-label-value')
    }
  })

  it('Link Label value does not get cleared even when address fields are cleared', () => {
    const row = buildFlashshipRow(makeItem({
      linkLabel: 'should-survive',
      address1:  '123 Main St',
    }))
    // Address cleared because linkLabel is set
    expect(row['Address line 1']).toBe('')
    // But Link Label itself must survive
    expect(row['Link Label']).toBe('should-survive')
  })
})

// ─── getPartialExportViolations ────────────────────────────────────────────────

describe('getPartialExportViolations', () => {
  it('returns [] when all exportable items in an order are checked', () => {
    const items = [
      makeItem({ orderId: 'ORD-A', variantId: '1' }),
      makeItem({ orderId: 'ORD-A', variantId: '2' }),
    ]
    const violations = getPartialExportViolations(items, new Set([0, 1]))
    expect(violations).toEqual([])
  })

  it('returns [] when none of the items in an order are checked', () => {
    const items = [
      makeItem({ orderId: 'ORD-A', variantId: '1' }),
      makeItem({ orderId: 'ORD-A', variantId: '2' }),
    ]
    const violations = getPartialExportViolations(items, new Set())
    expect(violations).toEqual([])
  })

  it('returns a violation when only some items from an order are checked', () => {
    const items = [
      makeItem({ orderId: 'ORD-A', customer: 'Alice', variantId: '1' }),
      makeItem({ orderId: 'ORD-A', customer: 'Alice', variantId: '2' }),
    ]
    // Only first item checked — partial!
    const violations = getPartialExportViolations(items, new Set([0]))
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('ORD-A')
    expect(violations[0]).toContain('1/2')
  })

  it('violation message contains customer name and order id', () => {
    const items = [
      makeItem({ orderId: 'ORD-X', customer: 'Bob Jones', variantId: '10' }),
      makeItem({ orderId: 'ORD-X', customer: 'Bob Jones', variantId: '11' }),
    ]
    const violations = getPartialExportViolations(items, new Set([0]))
    expect(violations[0]).toContain('Bob Jones')
    expect(violations[0]).toContain('ORD-X')
  })

  it('ignores items with isPartialLock=true — they are already blocked', () => {
    const items = [
      makeItem({ orderId: 'ORD-B', variantId: '3', isPartialLock: true }),
      makeItem({ orderId: 'ORD-B', variantId: '4', isPartialLock: true }),
    ]
    // Even checking only one does NOT raise a violation — both are locked
    const violations = getPartialExportViolations(items, new Set([0]))
    expect(violations).toEqual([])
  })

  it('ignores items with no variantId — they are already locked', () => {
    const items = [
      makeItem({ orderId: 'ORD-C', variantId: '' }),
      makeItem({ orderId: 'ORD-C', variantId: '' }),
    ]
    const violations = getPartialExportViolations(items, new Set([0]))
    expect(violations).toEqual([])
  })

  it('handles multiple orders independently', () => {
    const items = [
      // ORD-1: both checked ✅
      makeItem({ orderId: 'ORD-1', variantId: 'A' }),
      makeItem({ orderId: 'ORD-1', variantId: 'B' }),
      // ORD-2: only one checked ❌
      makeItem({ orderId: 'ORD-2', customer: 'Carol', variantId: 'C' }),
      makeItem({ orderId: 'ORD-2', customer: 'Carol', variantId: 'D' }),
      // ORD-3: none checked ✅
      makeItem({ orderId: 'ORD-3', variantId: 'E' }),
    ]
    const violations = getPartialExportViolations(items, new Set([0, 1, 2]))
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('ORD-2')
  })

  it('a mix of locked and normal items in same order does not block the normal ones', () => {
    // ORD-D has one locked item (no variantId) and two exportable items
    const items = [
      makeItem({ orderId: 'ORD-D', variantId: '' }),       // locked — ignored
      makeItem({ orderId: 'ORD-D', variantId: 'X' }),      // exportable
      makeItem({ orderId: 'ORD-D', variantId: 'Y' }),      // exportable
    ]
    // Checking only one of the exportable ones raises a violation
    const violations = getPartialExportViolations(items, new Set([1]))
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('1/2')
  })
})
