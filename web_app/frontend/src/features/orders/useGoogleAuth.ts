
import { useContext , createContext} from 'react';

interface GoogleAuthContextType {
  signedIn: boolean
  accessToken: string | null
  error: string | null
  signIn: () => void
  signOut: () => void
}
export const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);
export const useGoogleAuth = () => {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  return ctx;
};