import { useContext } from 'react'
import { DesignContext } from './DesignContext'

export const useDesignContext = () => {
  const ctx = useContext(DesignContext)
  if (!ctx) throw new Error('useDesignContext must be used within a DesignProvider')
  return ctx
}