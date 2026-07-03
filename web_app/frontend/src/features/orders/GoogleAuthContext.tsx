import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
// useGoogleLogin must be called at the top level of the provider so that the login function is stable and can be used by any consumer.
import { useGoogleLogin } from '@react-oauth/google'
import { GoogleAuthContext } from './useGoogleContext'

interface GoogleAuthContextType {
  signedIn: boolean
  accessToken: string | null
  error: string | null
  signIn: () => void
  signOut: () => void
  backendUser: any | null // Add state tracking for your Python backend response
  isLoading: boolean     // Track backend communication network state
}

//export const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

const TOKEN_KEY = 'google_access_token';
const EXPIRES_KEY = 'google_expires_at';

function getStoredToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = localStorage.getItem(EXPIRES_KEY);
  if (!token || !expiresAt) return null;
  if (Date.now() >= Number(expiresAt)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    return null;
  }
  return { token, expiresAt: Number(expiresAt) };
}

export const GoogleAuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    const stored = getStoredToken();
    return stored ? stored.token : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [backendUser, setBackendUser] = useState<any | null>(null);

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    }
  }, [accessToken]);

  // Auto sign out when token expires
  useEffect(() => {
    if (!accessToken) return;
    const expiresAt = Number(localStorage.getItem(EXPIRES_KEY));
    if (!expiresAt) return;
    const timeout = setTimeout(() => {
      setAccessToken(null);
      setError('Google token expired');
    }, expiresAt - Date.now());
    return () => clearTimeout(timeout);
  }, [accessToken]);

  const login = useGoogleLogin({
    onSuccess: async ({ access_token, expires_in }) => {
      if (!access_token) {
        setError('No token returned from Google');
        setAccessToken(null);
        return;
      }
      setAccessToken(access_token);
      setError(null);
      localStorage.setItem(TOKEN_KEY, access_token);
      if (expires_in) {
        const expiresAt = Date.now() + expires_in * 1000;
        localStorage.setItem(EXPIRES_KEY, expiresAt.toString());
      }

      setIsLoading(true);
      try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: access_token }),
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
          console.log('Backend auth response:', data);
          setBackendUser(data.user); // Backend validated successfully!
        } else {
          setError(data.detail || 'Backend login authentication rejected.');
          signOut(); // Rollback local login if backend rejects it
        }
      } catch (err) {
        setError('Unable to reach backend auth server.');
        signOut();
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError('Google sign-in failed');
      setAccessToken(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    },
    scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
  });

  const signIn = () => {
    login();
  };

  const signOut = () => {
    setAccessToken(null);
    setError(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
  };

  return (
    <GoogleAuthContext.Provider
      value={{
        signedIn: !!accessToken,
        accessToken,
        error,
        signIn,
        signOut,
        backendUser,
        isLoading,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

