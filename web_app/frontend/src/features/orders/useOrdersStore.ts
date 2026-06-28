import { useState, useCallback, useEffect } from 'react'
import Papa from 'papaparse'
import { parseCsvRows } from './csvParser'
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
type CheckedState = Record<string, boolean>;  // row index → checked

export const useOrdersStore = () => {
  // Restore from localStorage if available
  const getInitialItems = (): OrderItem[] => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        parsed = parsed.items.sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
        return parsed || []
      } catch {}
    }
    return []
  }
  const getInitialChecked = (): CheckedState => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
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
      LOCAL_STORAGE_KEY,
      JSON.stringify({ items, checked })
    )
  }, [items, checked])

  const importCsv = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    try {
      const text = await file.text()
      const { data } = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      })
      let parsed = parseCsvRows(data, MAPPING, COLOR_FIX, SIZE_FIX, imageMapping);
      // Sort by orderDate descending (newest first).
      parsed = parsed.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      setItems(parsed)
      setChecked({})
      // items and checked will be persisted by useEffect
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse CSV')
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateItem = (index: number, patch: Partial<OrderItem>) => {
    //setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
    let newItems = [...items];
    let orderId = newItems[index].orderId;
    newItems[index] = { ...newItems[index], ...patch };
    let variantion = newItems[index].variation;
    if (Object.keys(patch).includes('style')) {
      if (patch['style'] && MAPPING[patch.style]) {
        if (variantion && MAPPING[patch.style][variantion]) {
          newItems[index].variantId = MAPPING[patch.style][variantion];
        } else {
          newItems[index].variantId = '';
        }
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

  const selectAll = useCallback(() => {
    const next: CheckedState = {}
    items.forEach((item, i) => {
      if (item.variantId && !item.isPartialLock) next[String(i)] = true
    })
    setChecked(next)
  }, [items])

  const clearAll = useCallback(() => setChecked({}), [])

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
