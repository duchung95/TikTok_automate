import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
// Add a default handler for the append endpoint to prevent 500 errors
beforeAll(() => {
  server.use(
    http.post(
      (req) => new URL(req.request.url).pathname.endsWith(':append'),
      () =>
        HttpResponse.json({
          updates: {
            updatedRows: 1,
            updatedColumns: 5,
            updatedCells: 5,
          },
          spreadsheetId: 'dummy-id',
        })
    )
  )
})
import type { OrderItem } from './types'
import {
  saveAccessToken,
  getAccessToken,
  clearAccessToken,
  isSignedIn,
  checkDuplicates,
  GSHEET_COLUMNS,
  appendToSheet,
  buildDesignRow,
  saveToDesignSheet,
  type DuplicateResolution,
} from './googleSheetExport'
import { FLASHSHIP_COLUMNS } from './exportXlsx'

// ── Shared constants ─────────────────────────────────────────────────────────

const MOCK_TOKEN = 'mock-access-token-abc123'
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_FULLFILL_ID
const SHEETS_API = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`

// ── Test fixtures ────────────────────────────────────────────────────────────

const makeItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  orderId: 'ORD-001',
  orderDate: '2026-05-20',
  customer: 'John Doe',
  variation: 'Black, M',
  fixedVariation: 'Black, M',
  variantId: 'VAR-123',
  quantity: 1,
  phone: '1234567890',
  state: 'California',
  address1: '123 Main St',
  address2: '',
  city: 'Los Angeles',
  zip: '90001',
  linkLabel: 'https://label.url',
  designFront: 'https://drive.google.com/design-front',
  designBack: '',
  mockupFront: 'https://drive.google.com/mockup-front',
  mockupBack: '',
  statusNote: '',
  isPartialLock: false,
  productName: 'T-Shirt Black',
  ...overrides,
})

// ── Token helpers ─────────────────────────────────────────────────────────────

describe('token helpers', () => {
  beforeEach(() => clearAccessToken())

  it('getAccessToken returns null when no token stored', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('isSignedIn returns false when no token stored', () => {
    expect(isSignedIn()).toBe(false)
  })

  it('saveAccessToken persists token and getAccessToken retrieves it', () => {
    saveAccessToken(MOCK_TOKEN)
    expect(getAccessToken()).toBe(MOCK_TOKEN)
  })

  it('isSignedIn returns true after saving a token', () => {
    saveAccessToken(MOCK_TOKEN)
    expect(isSignedIn()).toBe(true)
  })

  it('clearAccessToken removes the token', () => {
    saveAccessToken(MOCK_TOKEN)
    clearAccessToken()
    expect(getAccessToken()).toBeNull()
  })

  it('isSignedIn returns false after clearing token', () => {
    saveAccessToken(MOCK_TOKEN)
    clearAccessToken()
    expect(isSignedIn()).toBe(false)
  })

  it('saveAccessToken overwrites existing token with new value', () => {
    saveAccessToken('old-token')
    saveAccessToken('new-token')
    expect(getAccessToken()).toBe('new-token')
  })

  it('stores token with special characters exactly as-is', () => {
    const specialToken = 'tok en/with+special=chars&more'
    saveAccessToken(specialToken)
    expect(getAccessToken()).toBe(specialToken)
  })
})

// ── GSHEET_COLUMNS ────────────────────────────────────────────────────────────

describe('GSHEET_COLUMNS', () => {
  it('has the correct number of columns', () => {
    expect(GSHEET_COLUMNS).toHaveLength(39) // update if you add/remove columns
  })

  it('matches the expected column order', () => {
    expect(GSHEET_COLUMNS).toEqual([
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
    ])
  })

  it('has no duplicate column names', () => {
    const unique = new Set(GSHEET_COLUMNS)
    expect(unique.size).toBe(GSHEET_COLUMNS.length)
  })
})

// ── checkDuplicates ───────────────────────────────────────────────────────────

describe('checkDuplicates', () => {
  it('returns all items as new when existingIds is empty', () => {
    const items = [makeItem({ orderId: 'ORD-001' }), makeItem({ orderId: 'ORD-002' })]
    const result = checkDuplicates(items, new Set())
    expect(result.newItems).toHaveLength(2)
    expect(result.duplicateItems).toHaveLength(0)
    expect(result.duplicateOrderIds).toHaveLength(0)
  })

  it('returns all items as new when no IDs match existing', () => {
    const items = [makeItem({ orderId: 'ORD-001' })]
    const existing = new Set(['HD - ORD-999', 'HD - ORD-998'])
    const result = checkDuplicates(items, existing)
    expect(result.newItems).toHaveLength(1)
    expect(result.duplicateItems).toHaveLength(0)
  })

  it('detects duplicates using HD - prefix matching', () => {
    const items = [makeItem({ orderId: 'ORD-001' })]
    const existing = new Set(['HD - ORD-001'])
    const result = checkDuplicates(items, existing)
    expect(result.duplicateItems).toHaveLength(1)
    expect(result.newItems).toHaveLength(0)
    expect(result.duplicateOrderIds).toEqual(['ORD-001'])
  })

  it('returns all items as duplicates when all exist in sheet', () => {
    const items = [makeItem({ orderId: 'ORD-001' }), makeItem({ orderId: 'ORD-002' })]
    const existing = new Set(['HD - ORD-001', 'HD - ORD-002'])
    const result = checkDuplicates(items, existing)
    expect(result.duplicateItems).toHaveLength(2)
    expect(result.newItems).toHaveLength(0)
  })

  it('handles mixed new and duplicate items', () => {
    const items = [
      makeItem({ orderId: 'ORD-001' }),
      makeItem({ orderId: 'ORD-002' }),
      makeItem({ orderId: 'ORD-003' }),
    ]
    const existing = new Set(['HD - ORD-002'])
    const result = checkDuplicates(items, existing)
    expect(result.newItems).toHaveLength(2)
    expect(result.duplicateItems).toHaveLength(1)
    expect(result.duplicateOrderIds).toEqual(['ORD-002'])
  })

  it('deduplicates duplicateOrderIds for split orders (same orderId multiple times)', () => {
    const items = [
      makeItem({ orderId: 'ORD-001' }),
      makeItem({ orderId: 'ORD-001' }), // same order, 2 rows (split order)
    ]
    const existing = new Set(['HD - ORD-001'])
    const result = checkDuplicates(items, existing)
    expect(result.duplicateItems).toHaveLength(2)
    expect(result.duplicateOrderIds).toHaveLength(1) // deduplicated
    expect(result.duplicateOrderIds).toEqual(['ORD-001'])
  })

  it('does not treat ORD-1 as duplicate of ORD-10 (substring safety)', () => {
    const items = [makeItem({ orderId: 'ORD-1' })]
    const existing = new Set(['HD - ORD-10'])
    const result = checkDuplicates(items, existing)
    expect(result.newItems).toHaveLength(1)
    expect(result.duplicateItems).toHaveLength(0)
  })

  it('handles empty items array gracefully', () => {
    const result = checkDuplicates([], new Set(['HD - ORD-001']))
    expect(result.newItems).toHaveLength(0)
    expect(result.duplicateItems).toHaveLength(0)
    expect(result.duplicateOrderIds).toHaveLength(0)
  })
})

// ── appendToSheet ─────────────────────────────────────────────────────────────

describe('appendToSheet', () => {
  beforeEach(() => {
    clearAccessToken()
  })

  it('throws Vietnamese error when not signed in', async () => {
    await expect(
      appendToSheet({ items: [makeItem()], checkedIndices: new Set([0]), onDuplicatesFound: vi.fn() })
    ).rejects.toThrow('Chưa đăng nhập Google')
  })

  it('throws error when no items are selected', async () => {
    saveAccessToken(MOCK_TOKEN)
    await expect(
      appendToSheet({ items: [makeItem()], checkedIndices: new Set(), onDuplicatesFound: vi.fn() })
    ).rejects.toThrow('Chưa chọn đơn hàng nào')
  })

  it('sends correct Authorization header', async () => {
    saveAccessToken(MOCK_TOKEN)
    let capturedAuth = ''

    server.use(
      http.get(`${SHEETS_API}/values/:range`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization') ?? ''
        return HttpResponse.json({ values: [['Order ID']] })
      }),
      http.post(
        (req) => new URL(req.request.url).pathname.endsWith(':append'),
        () => HttpResponse.json({})
      )
    )

    await appendToSheet({ items: [makeItem()], checkedIndices: new Set([0]), onDuplicatesFound: vi.fn() })
    expect(capturedAuth).toBe(`Bearer ${MOCK_TOKEN}`)
  })

  it('appends all items when no duplicates found', async () => {
    saveAccessToken(MOCK_TOKEN)
    let appendedRows: string[][] = []

    server.use(
      http.get(`${SHEETS_API}/values/:range`, () =>
        HttpResponse.json({ values: [['Order ID']] }) // only header row
      ),
      http.post(
        (req) => new URL(req.request.url).pathname.endsWith(':append'),
        async ({ request }) => {
          const body = await request.json() as { values: string[][] }
          appendedRows = body.values
          return HttpResponse.json({})
        }
      )
    )

    const items = [makeItem({ orderId: 'ORD-001' }), makeItem({ orderId: 'ORD-002' })]
    const result = await appendToSheet({ items, checkedIndices: new Set([0, 1]), onDuplicatesFound: vi.fn() })

    expect(result.appended).toBe(2)
    expect(appendedRows).toHaveLength(2)
  })

  it('does NOT call onDuplicatesFound when there are no duplicates', async () => {
    saveAccessToken(MOCK_TOKEN)
    const onDuplicatesFound = vi.fn()

    server.use(
      http.get(`${SHEETS_API}/values/:range`, () => HttpResponse.json({ values: [['Order ID']] })),
      http.post(
        (req) => new URL(req.request.url).pathname.endsWith(':append'),
        () => HttpResponse.json({})
      )
    )

    await appendToSheet({ items: [makeItem({ orderId: 'ORD-NEW' })], checkedIndices: new Set([0]), onDuplicatesFound })
    expect(onDuplicatesFound).not.toHaveBeenCalled()
  })

  it('calls onDuplicatesFound when duplicates exist', async () => {
    saveAccessToken(MOCK_TOKEN)
    const onDuplicatesFound = vi.fn().mockResolvedValue('skip' as DuplicateResolution)

    server.use(
      http.get(`${SHEETS_API}/values/:range`, () =>
        HttpResponse.json({ values: [['Order ID'], ['HD - ORD-001']] })
      ),
      http.post(
        (req) => new URL(req.request.url).pathname.endsWith(':append'),
        () => HttpResponse.json({})
      )
    )

    await appendToSheet({ items: [makeItem({ orderId: 'ORD-001' })], checkedIndices: new Set([0]), onDuplicatesFound })
    expect(onDuplicatesFound).toHaveBeenCalledOnce()
  })

  it('returns { appended: 0 } when resolution is cancel', async () => {
    saveAccessToken(MOCK_TOKEN)

    server.use(
      http.get(`${SHEETS_API}/values/:range`, () =>
        HttpResponse.json({ values: [['Order ID'], ['HD - ORD-001']] })
      )
    )

    const result = await appendToSheet({
      items: [makeItem({ orderId: 'ORD-001' })],
      checkedIndices: new Set([0]),
      onDuplicatesFound: vi.fn().mockResolvedValue('cancel'),
    })
    expect(result.appended).toBe(0)
  })

  it('skips duplicates and only appends new items when resolution is skip', async () => {
    saveAccessToken(MOCK_TOKEN)
    let appendedRows: string[][] = []

    server.use(
      http.get(`${SHEETS_API}/values/:range`, () =>
        HttpResponse.json({ values: [['Order ID'], ['HD - ORD-001']] })
      ),
      http.post(
        (req) => new URL(req.request.url).pathname.endsWith(':append'),
        async ({ request }) => {
          const body = await request.json() as { values: string[][] }
          appendedRows = body.values
          return HttpResponse.json({})
        }
      )
    )

    const items = [makeItem({ orderId: 'ORD-001' }), makeItem({ orderId: 'ORD-002' })]
    const result = await appendToSheet({
      items,
      checkedIndices: new Set([0, 1]),
      onDuplicatesFound: vi.fn().mockResolvedValue('skip'),
    })

    expect(result.appended).toBe(1) // only ORD-002
    expect(appendedRows).toHaveLength(1)
  })

  it('appends all items including duplicates when resolution is overwrite', async () => {
    saveAccessToken(MOCK_TOKEN)
    let appendedRows: string[][] = []

    server.use(
      http.get(`${SHEETS_API}/values/:range`, () =>
        HttpResponse.json({ values: [['Order ID'], ['HD - ORD-001']] })
      ),
      http.post(
        (req) => new URL(req.request.url).pathname.endsWith(':append'),
        async ({ request }) => {
          const body = await request.json() as { values: string[][] }
          appendedRows = body.values
          return HttpResponse.json({})
        }
      )
    )

    const items = [makeItem({ orderId: 'ORD-001' }), makeItem({ orderId: 'ORD-002' })]
    const result = await appendToSheet({
      items,
      checkedIndices: new Set([0, 1]),
      onDuplicatesFound: vi.fn().mockResolvedValue('overwrite'),
    })

    expect(result.appended).toBe(2)
    expect(appendedRows).toHaveLength(2)
  })

  it('throws error when Google Sheets API returns non-ok response', async () => {
    saveAccessToken(MOCK_TOKEN)

    server.use(
      http.get(`${SHEETS_API}/values/:range`, () =>
        HttpResponse.json({ error: { message: 'The caller does not have permission' } }, { status: 403 })
      )
    )

    await expect(
      appendToSheet({ items: [makeItem()], checkedIndices: new Set([0]), onDuplicatesFound: vi.fn() })
    ).rejects.toThrow('The caller does not have permission')
  })
})

// ── buildDesignRow ────────────────────────────────────────────────────────────

describe('buildDesignRow', () => {
  it('maps productName, designFront, and mockupFront to correct columns', () => {
    const row = buildDesignRow(makeItem({ productName: 'T-Shirt Black' }))
    expect(row[0]).toBe('T-Shirt Black')                                  // A: Design Names
    expect(row[1]).toBe('https://drive.google.com/design-front')          // B: Design Image Link
    expect(row[2]).toBe('')                                               // C: empty (ARRAYFORMULA)
    expect(row[3]).toBe('https://drive.google.com/mockup-front')          // D: Mockup Image Link
    expect(row[4]).toBe('')                                               // E: empty (ARRAYFORMULA)
  })

  it('falls back to designBack when designFront is empty', () => {
    const row = buildDesignRow(makeItem({ designFront: '', designBack: 'https://back.url' }))
    expect(row[1]).toBe('https://back.url')
  })

  it('falls back to mockupBack when mockupFront is empty', () => {
    const row = buildDesignRow(makeItem({ mockupFront: '', mockupBack: 'https://mockup-back.url' }))
    expect(row[3]).toBe('https://mockup-back.url')
  })
})

// ── saveToDesignSheet ─────────────────────────────────────────────────────────

describe('saveToDesignSheet', () => {
  const DESIGN_SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_DESIGN_ID
  const DESIGN_API = `https://sheets.googleapis.com/v4/spreadsheets/${DESIGN_SHEET_ID}`

  beforeEach(() => { saveAccessToken(MOCK_TOKEN) })

  it('returns { saved: 0 } when design already exists in sheet', async () => {
    server.use(
      http.get(`${DESIGN_API}/values/:range`, () =>
        HttpResponse.json({ values: [['Design Names'], ['T-Shirt Black']] })
      )
    )
    const result = await saveToDesignSheet([makeItem({ productName: 'T-Shirt Black' })], MOCK_TOKEN)
    expect(result.saved).toBe(0)
  })

  it('saves new designs and deduplicates within the batch', async () => {
    let appendedRows: string[][] = []
    server.use(
      http.get(`${DESIGN_API}/values/:range`, () =>
        HttpResponse.json({ values: [['Design Names']] })
      ),
      http.post(
        (req) => new URL(req.request.url).pathname.includes(DESIGN_SHEET_ID),
        async ({ request }) => {
          const body = await request.json() as { values: string[][] }
          appendedRows = body.values
          return HttpResponse.json({})
        }
      )
    )
    const items = [
      makeItem({ orderId: 'ORD-001', productName: 'Design A' }),
      makeItem({ orderId: 'ORD-002', productName: 'Design B' }),
      makeItem({ orderId: 'ORD-003', productName: 'Design A' }), // duplicate in batch
    ]
    const result = await saveToDesignSheet(items, MOCK_TOKEN)
    expect(result.saved).toBe(2)
    expect(appendedRows).toHaveLength(2)
    expect(appendedRows[0][0]).toBe('Design A')
    expect(appendedRows[1][0]).toBe('Design B')
  })

  it('skips items with no productName', async () => {
    server.use(http.get(`${DESIGN_API}/values/:range`, () => HttpResponse.json({ values: [] })))
    const result = await saveToDesignSheet([makeItem({ productName: '' })], MOCK_TOKEN)
    expect(result.saved).toBe(0)
  })

  it('skips items with no design URL', async () => {
    server.use(http.get(`${DESIGN_API}/values/:range`, () => HttpResponse.json({ values: [] })))
    const result = await saveToDesignSheet(
      [makeItem({ designFront: '', designBack: '' })], MOCK_TOKEN
    )
    expect(result.saved).toBe(0)
  })
})
