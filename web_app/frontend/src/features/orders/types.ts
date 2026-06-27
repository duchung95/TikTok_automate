export interface OrderItem {
  isSelected: boolean
  orderId: string
  orderDate: string       // ISO date string YYYY-MM-DD
  customer: string
  variation: string
  fixedVariation: string
  variantId: string       // empty string if not found in mapping
  quantity: number
  phone: string
  state: string
  address1: string
  address2: string
  city: string
  zip: string
  linkLabel: string
  designFront: string
  designBack: string
  mockupFront: string
  mockupBack: string
  statusNote: string
  isPartialLock: boolean
  productName: string
  mainImageUrl?: string[]
  style: string
}
