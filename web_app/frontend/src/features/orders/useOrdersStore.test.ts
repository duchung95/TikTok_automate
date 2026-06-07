import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from "@testing-library/react";
import { useOrdersStore } from "./useOrdersStore";
import type { OrderItem } from "./types";

const mockOrderItem: OrderItem = {
  orderId: "1",
  orderDate: "2024-01-01",
  customer: "A",
  variation: "Tee",
  fixedVariation: "Tee",
  variantId: "v1",
  quantity: 1,
  phone: "123456789",
  state: "CA",
  address1: "123 Main St",
  address2: "",
  city: "Los Angeles",
  zip: "90001",
  linkLabel: "",
  designFront: "",
  designBack: "",
  mockupFront: "",
  mockupBack: "",
  statusNote: "",
  isPartialLock: false,
  productName:    'T-Shirt',
};

describe("useOrdersStore (React hook version)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("sets items and persists to localStorage", () => {
    const { result } = renderHook(() => useOrdersStore());
    const items: OrderItem[] = [mockOrderItem];
    act(() => {
      result.current.setItems(items);
    });
    expect(result.current.items).toEqual(items);
    const saved = JSON.parse(window.localStorage.getItem("ordersPageState")!);
    expect(saved.items).toEqual(items);
  });

  it("sets checked and persists to localStorage", () => {
    const { result } = renderHook(() => useOrdersStore());
    const checked = { "0": true };
    act(() => {
      result.current.setChecked(checked);
    });
    expect(result.current.checked).toEqual(checked);
    const saved = JSON.parse(window.localStorage.getItem("ordersPageState")!);
    expect(saved.checked).toEqual(checked);
  });

  it("restores state from localStorage", () => {
    const items: OrderItem[] = [mockOrderItem];
    const checked = { "0": true };
    window.localStorage.setItem(
      "ordersPageState",
      JSON.stringify({ items, checked })
    );
    const { result } = renderHook(() => useOrdersStore());
    expect(result.current.items).toEqual(items);
    expect(result.current.checked).toEqual(checked);
  });

  // You can add more tests for importCsv, updateItem, etc. as needed
});
