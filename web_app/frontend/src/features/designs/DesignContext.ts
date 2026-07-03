import { createContext } from 'react'

/** Shape of each design row from the Google Sheet */
export type DesignRow = {
  productName: string
  sku: string
  frontDesignLink: string
  frontDesignImage: string
  frontMockupLink: string
  frontMockupImage: string
  backDesignLink: string
  backDesignImage: string
  backMockupLink: string
  backMockupImage: string
}

export interface DesignContextType {
  designs: DesignRow[]
  isLoading: boolean
  searchText: string
  setSearchTextWithCache: (text: string) => void
  refresh: () => Promise<void>
  fetchDesigns: () => Promise<void>
}

export const DesignContext = createContext<DesignContextType | undefined>(undefined)
