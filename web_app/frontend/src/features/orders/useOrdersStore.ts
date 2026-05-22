import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { parseCsvRows, markPartialOrders } from './csvParser'
import type { OrderItem } from './types'

const MAPPING_URL = './flashship_mapping.json'

type CheckedState = Record<string, boolean>  // row index → checked

export function useOrdersStore() {
  const [items, setItems] = useState<OrderItem[]>([])
  const [checked, setChecked] = useState<CheckedState>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const importCsv = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null);
    const a = 5;
    try {
      const raw = await fetch(MAPPING_URL).then(r => r.json())
      const mapping: Record<string, string> = Object.fromEntries(
        Object.entries(raw.variant_map as Record<string, number>).map(([k, v]) => [k, String(v)])
      )
      const colorFix: Record<string, string> = raw.color_fix ?? {}
      const sizeFix: Record<string, string>  = raw.size_fix  ?? {}
      const text = await file.text()
      const { data } = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      })
      const parsed = markPartialOrders(parseCsvRows(data, mapping, colorFix, sizeFix))
      setItems(parsed)
      setChecked({})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse CSV')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateItem = useCallback((index: number, patch: Partial<OrderItem>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item))
  }, [])

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
    items, checked, isLoading, error,
    importCsv, updateItem, toggleChecked, selectAll, clearAll, checkedItems,
  }
}
