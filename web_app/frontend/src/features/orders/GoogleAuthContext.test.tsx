import { vi } from 'vitest'
// TypeScript: declare window.__simulateGoogleError for test control
declare global {
  interface Window {
    __simulateGoogleError?: boolean;
  }
}
// Mock useGoogleLogin to simulate sign-in success and error
vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: (opts: any) => () => {
    if (window.__simulateGoogleError) {
      opts.onError();
    } else {
      opts.onSuccess({ access_token: 'mock_token' });
    }
  },
  GoogleOAuthProvider: ({ children }: any) => <div>{children}</div>,
}));
import { GoogleOAuthProvider } from '@react-oauth/google'
function renderWithProvider(children: React.ReactNode) {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <GoogleAuthProvider>{children}</GoogleAuthProvider>
    </GoogleOAuthProvider>
  )
}
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { GoogleAuthProvider, useGoogleAuth } from './GoogleAuthContext'

function TestConsumer() {
  const { signedIn, accessToken, signIn, signOut, error } = useGoogleAuth()
  return (
    <div>
      <div data-testid="signed-in">{String(signedIn)}</div>
      <div data-testid="access-token">{accessToken || ''}</div>
      <div data-testid="error">{error || ''}</div>
  <button data-testid="sign-in-btn" onClick={() => signIn()}>Sign In</button>
  <button data-testid="sign-out-btn" onClick={signOut}>Sign Out</button>
    </div>
  )
}

describe('GoogleAuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('provides default state', () => {
    renderWithProvider(<TestConsumer />)
  expect(screen.getAllByTestId('signed-in')[0].textContent).toBe('false')
  expect(screen.getAllByTestId('access-token')[0].textContent).toBe('')
  })

  it('signs in and updates state', async () => {
  renderWithProvider(<TestConsumer />)
  fireEvent.click(screen.getAllByTestId('sign-in-btn')[0])
    await waitFor(() => {
      expect(screen.getAllByTestId('signed-in')[0].textContent).toBe('true')
      expect(screen.getAllByTestId('access-token')[0].textContent).toBe('mock_token')
    })
  })

  it('signs out and clears state', async () => {
  renderWithProvider(<TestConsumer />)
    fireEvent.click(screen.getAllByTestId('sign-in-btn')[0])
    await waitFor(() => expect(screen.getAllByTestId('signed-in')[0].textContent).toBe('true'))
    fireEvent.click(screen.getAllByTestId('sign-out-btn')[0])
    await waitFor(() => {
      expect(screen.getAllByTestId('signed-in')[0].textContent).toBe('false')
      expect(screen.getAllByTestId('access-token')[0].textContent).toBe('')
    })
  })

  it('persists token in localStorage', async () => {
  renderWithProvider(<TestConsumer />)
  fireEvent.click(screen.getAllByTestId('sign-in-btn')[0])
    await waitFor(() => expect(localStorage.getItem('google_access_token')).toBe('mock_token'))
  })

  it('handles sign-in failure', async () => {
    // Simulate error in signIn
    window.__simulateGoogleError = true;
    const ErrorConsumer = () => {
      const { signIn, error } = useGoogleAuth()
      return (
        <>
          <button data-testid="sign-in-btn" onClick={() => signIn()}>Sign In</button>
          <div data-testid="error">{error || ''}</div>
        </>
      )
    }
    renderWithProvider(<ErrorConsumer />)
    fireEvent.click(screen.getAllByTestId('sign-in-btn')[0])
    await waitFor(() => expect(screen.getAllByTestId('error')[0].textContent).not.toBe(''))
    window.__simulateGoogleError = false;
  })

  it('clears token on sign out', async () => {
  renderWithProvider(<TestConsumer />)
  fireEvent.click(screen.getAllByTestId('sign-in-btn')[0])
  await waitFor(() => expect(localStorage.getItem('google_access_token')).toBe('mock_token'))
  fireEvent.click(screen.getAllByTestId('sign-out-btn')[0])
  await waitFor(() => expect(localStorage.getItem('google_access_token')).toBe(null))
  })
})
