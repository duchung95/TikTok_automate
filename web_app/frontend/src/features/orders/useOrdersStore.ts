import { useState, useCallback, useEffect } from 'react'
import Papa from 'papaparse'
import { parseCsvRows, mapVariant } from './csvParser'
import type { OrderItem } from './types'
import rawMapping from '../../flashship_mapping.json';
import listingImageMapping from '../../../scripts/listing_images.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const raw = rawMapping as any;
const MAPPING: Record<string, Record<string, string>> = raw.variant_map;

const imageMapping: Record<string, string[]> = listingImageMapping as Record<string, string[]>;
const COLOR_FIX: Record<string, string> = raw.color_fix ?? {};
const SIZE_FIX: Record<string, string>  = raw.size_fix  ?? {};

const LOCAL_STORAGE_KEY = "ordersPageState";
const UNFULFILLED_LOCAL_STORAGE_KEY = "unfulfilledOrders";
type CheckedState = Record<string, boolean>;  // row index → checked

type useOrdersStoreProps = {
  findUnfulfilledOrders?: boolean | undefined;
  alreadyFullfilledOrders?: string[];
};

export const useOrdersStore = (props?: useOrdersStoreProps) => {
  const localStorageKey = props?.findUnfulfilledOrders ? UNFULFILLED_LOCAL_STORAGE_KEY : LOCAL_STORAGE_KEY;

  // Restore from localStorage if available
  const getInitialItems = (): OrderItem[] => {
    const saved = localStorage.getItem(localStorageKey)
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        if (props?.findUnfulfilledOrders) {
          parsed = parsed.items.sort((a: any, b: any) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
        } else {
          parsed = parsed.items.sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
        }
        
        return parsed || []
      } catch {}
    }
    return []
  }
  const getInitialChecked = (): CheckedState => {
    const saved = localStorage.getItem(localStorageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed.checked || {}
      } catch {}
    }
    return {}
  }

  const [items, setItems] = useState<OrderItem[]>(getInitialItems)
  const [checked, setChecked] = useState<CheckedState>(getInitialChecked)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(
      localStorageKey,
      JSON.stringify({ items, checked })
    )
  }, [items, checked]);

  const importCsv = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    try {
      const text = await file.text()
      const { data } = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      })
      let parsed = parseCsvRows(data, MAPPING, COLOR_FIX, SIZE_FIX, imageMapping, props?.findUnfulfilledOrders);
      // Sort by orderDate descending (newest first) if this is not to find unfullfilled item.
      if (props?.findUnfulfilledOrders) {
        parsed = parsed.sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime())
      } else {
        parsed = parsed.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      }
      
      setItems(parsed)
      setChecked({})
      // items and checked will be persisted by useEffect
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse CSV')
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateItem = (rowIndex: number, patch: Partial<OrderItem>, rowOrderId?: string) => {
    //setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
    let newItems = [...items];
    let index = rowIndex;
    

    let orderId = newItems[index]?.orderId;
    if (rowOrderId && rowOrderId !== orderId) {
      alert(`Order ID mismatch: ${rowOrderId} !== ${orderId}`);
      return;
    }
    newItems[index] = { ...newItems[index], ...patch };
    let variation = newItems[index].variation;
    if (Object.keys(patch).includes('style')) {

      let sub_mapping = {};
      if (patch['style'] && MAPPING[patch.style]) {
        sub_mapping = MAPPING[patch.style];
        const { fixedVariation, variantId } = mapVariant(variation, sub_mapping, COLOR_FIX, SIZE_FIX);
        newItems[index].variantId = variantId;
      } else {
        newItems[index].variantId = '';
      }
    }

    if (Object.keys(patch).includes('linkLabel') || Object.keys(patch).includes('isSelected')) {
      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        if (item.orderId === orderId && i !== index) {
          newItems[i] = { ...newItems[i], ...patch };
        }
      }
      
    }
    setItems(newItems);
  };

  const toggleChecked = useCallback((rowKey: string) => {
    setChecked(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))
  }, [])

  const selectAll = () => {
    const newItems: OrderItem[] = structuredClone(items);
    newItems.forEach((item, i) => {
      item.isSelected = true;
    })
    setItems(newItems);
  };

  const clearAll = () => {
    const newItems: OrderItem[] = structuredClone(items);
    newItems.forEach((item, i) => {
      item.isSelected = false;
    })
    setItems(newItems);
  };

  const checkedItems = items.filter((_, i) => checked[String(i)])

  return {
    items,
    checked,
    isLoading,
    error,
    importCsv,
    setItems,
    setChecked,
    setIsLoading,
    setError,
    updateItem,
    toggleChecked,
    selectAll,
    clearAll,
    checkedItems,
  }
}
