import { describe, it, expect } from 'vitest'
import type { OrderItem } from './types'
import { getRowStatus } from './OrdersTable'

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
  productName:    'T-Shirt',
  ...overrides,
})

describe('getRowStatus', () => {
  it('returns "locked" when variantId is empty and not a partial lock', () => {
    expect(getRowStatus(makeItem({ variantId: '', isPartialLock: false }))).toBe('locked')
  })

  it('returns "partial" when isPartialLock is true', () => {
    expect(getRowStatus(makeItem({ isPartialLock: true }))).toBe('partial')
  })

  it('returns "needs-link-label" when linkLabel is empty', () => {
    expect(getRowStatus(makeItem({ linkLabel: '' }))).toBe('needs-link-label')
  })

  it('returns "needs-link-label" when linkLabel is whitespace only', () => {
    expect(getRowStatus(makeItem({ linkLabel: '   ' }))).toBe('needs-link-label')
  })

  it('returns "needs-design" when both designFront and designBack are empty', () => {
    expect(getRowStatus(makeItem({ designFront: '', designBack: '' }))).toBe('needs-design')
  })

  it('returns "needs-mockup" when both mockupFront and mockupBack are empty', () => {
    expect(getRowStatus(makeItem({ mockupFront: '', mockupBack: '' }))).toBe('needs-mockup')
  })

  it('returns "ready" when all required fields are present', () => {
    expect(getRowStatus(makeItem())).toBe('ready')
  })

  it('returns "ready" when only designFront is set (designBack is empty)', () => {
    expect(getRowStatus(makeItem({ designFront: 'https://url', designBack: '' }))).toBe('ready')
  })

  it('returns "ready" when only mockupBack is set (mockupFront is empty)', () => {
    expect(getRowStatus(makeItem({ mockupFront: '', mockupBack: 'https://url' }))).toBe('ready')
  })
})
