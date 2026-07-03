import { useContext, createContext } from 'react';
//import {GoogleAuthContext} from './GoogleAuthContext';

interface GoogleAuthContextType {
  signedIn: boolean
  accessToken: string | null
  error: string | null
  signIn: () => void
  signOut: () => void
  backendUser: any | null // Add state tracking for your Python backend response
  isLoading: boolean     // Track backend communication network state
}

export const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);
export const useGoogleAuth = () => {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  return ctx;
};