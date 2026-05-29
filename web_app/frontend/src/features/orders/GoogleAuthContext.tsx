import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
// useGoogleLogin must be called at the top level of the provider so that the login function is stable and can be used by any consumer.
import { useGoogleLogin } from '@react-oauth/google'

interface GoogleAuthContextType {
  signedIn: boolean
  accessToken: string | null
  error: string | null
  signIn: () => void
  signOut: () => void
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined)

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('google_access_token'))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('google_access_token', accessToken)
    } else {
      localStorage.removeItem('google_access_token')
    }
  }, [accessToken])

  const login = useGoogleLogin({
    onSuccess: ({ access_token }) => {
      if (!access_token) {
        setError('No token returned from Google')
        setAccessToken(null)
        return
      }
      setAccessToken(access_token)
      setError(null)
    },
    onError: () => {
      setError('Google sign-in failed')
      setAccessToken(null)
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly',
  })

  const signIn = () => {
    login()
  }

  const signOut = () => {
    setAccessToken(null)
    setError(null)
  }

  return (
    <GoogleAuthContext.Provider
      value={{
        signedIn: !!accessToken,
        accessToken,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  )
}

export function useGoogleAuth() {
  const ctx = useContext(GoogleAuthContext)
  if (!ctx) throw new Error('useGoogleAuth must be used within a GoogleAuthProvider')
  return ctx
}
