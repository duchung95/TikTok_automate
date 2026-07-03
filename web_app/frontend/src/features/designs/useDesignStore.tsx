import { useState, useCallback, useEffect, ReactNode } from 'react'
import { fetchDesignSheet } from './designAction'
import { DesignContext, DesignRow } from './DesignContext'

interface DesignCache {
  designs: DesignRow[]
  cachedToken: string
  searchText: string
}

const STORAGE_KEY = 'design_cache';

const loadCache = (): DesignCache | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
};


/** Provides design list with localStorage caching. Only refetches when token changes or user forces refresh. */
export const DesignProvider = ({ children }: { children: ReactNode }) => {
  const [designs, setDesigns] = useState<DesignRow[]>(() => loadCache()?.designs ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState(() => loadCache()?.searchText ?? '');

  const fetchDesigns = useCallback(async (force = false) => {
    const token = localStorage.getItem('google_access_token')
    if (!token) return

    const cache = loadCache()
    // Use cache if same token and data exists, unless forced
    if (!force && cache?.cachedToken === token && cache.designs.length > 0) return

    setIsLoading(true)
    try {
      const data = await fetchDesignSheet(token)
      setDesigns(data)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ designs: data, cachedToken: token }))
    } finally {
      setIsLoading(false)
    }
  }, []);

  const setSearchTextWithCache = useCallback((text: string) => {
    setSearchText(text)
    const cache = loadCache()
    if (cache) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cache, searchText: text }))
    }
  }, []);

  useEffect(() => { fetchDesigns() }, [fetchDesigns]);

  const refresh = useCallback(() => fetchDesigns(true), [fetchDesigns]);

  return (
    <DesignContext.Provider 
      value={{ designs, isLoading, refresh, searchText, setSearchTextWithCache, fetchDesigns }}
    >
      {children}
    </DesignContext.Provider>
  )
}

