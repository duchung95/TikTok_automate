import { OrderItem, RowStatus } from "../orders/types";

export const getRowStatus = (item: OrderItem): RowStatus => {
  if (!item.variantId) return 'locked'
  if (!item.variantId && !item.isPartialLock) return 'locked'
  if (item.isPartialLock) return 'partial'
  if (!item.linkLabel.trim()) return 'needs-link-label'
  if (!item.designFront.trim() && !item.designBack.trim()) return 'needs-design'
  if (!item.mockupFront.trim() && !item.mockupBack.trim()) return 'needs-mockup'
  return 'ready'
};