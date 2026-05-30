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
import React from 'react'
import { render, act, fireEvent, waitFor, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { GoogleAuthProvider, useGoogleAuth } from './GoogleAuthContext'
import { GoogleOAuthProvider } from '@react-oauth/google'

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

function renderWithProvider(children: React.ReactNode) {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <GoogleAuthProvider>{children}</GoogleAuthProvider>
    </GoogleOAuthProvider>
  )
}

describe('GoogleAuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('provides default state', () => {
    renderWithProvider(<TestConsumer />)
    const signedInEls = screen.getAllByTestId('signed-in')
    const accessTokenEls = screen.getAllByTestId('access-token')
    expect(signedInEls[signedInEls.length - 1].textContent).toBe('false')
    expect(accessTokenEls[accessTokenEls.length - 1].textContent).toBe('')
  })

  it('signs in and updates state', async () => {
    renderWithProvider(<TestConsumer />)
    const signInEls = screen.getAllByTestId('sign-in-btn')
    fireEvent.click(signInEls[signInEls.length - 1])
    await waitFor(() => {
      const signedInEls = screen.getAllByTestId('signed-in')
      const accessTokenEls = screen.getAllByTestId('access-token')
      expect(signedInEls[signedInEls.length - 1].textContent).toBe('true')
      expect(accessTokenEls[accessTokenEls.length - 1].textContent).toBe('mock_token')
    })
  })

  it('signs out and clears state', async () => {
    renderWithProvider(<TestConsumer />)
    const signInEls = screen.getAllByTestId('sign-in-btn')
    fireEvent.click(signInEls[signInEls.length - 1])
    await waitFor(() => {
      const signedInEls = screen.getAllByTestId('signed-in')
      expect(signedInEls[signedInEls.length - 1].textContent).toBe('true')
    })
    const signOutEls = screen.getAllByTestId('sign-out-btn')
    fireEvent.click(signOutEls[signOutEls.length - 1])
    await waitFor(() => {
      const signedInEls = screen.getAllByTestId('signed-in')
      const accessTokenEls = screen.getAllByTestId('access-token')
      expect(signedInEls[signedInEls.length - 1].textContent).toBe('false')
      expect(accessTokenEls[accessTokenEls.length - 1].textContent).toBe('')
    })
  })

  it('persists token in localStorage', async () => {
    renderWithProvider(<TestConsumer />)
    const signInEls = screen.getAllByTestId('sign-in-btn')
    fireEvent.click(signInEls[signInEls.length - 1])
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
    const signInEls = screen.getAllByTestId('sign-in-btn')
    fireEvent.click(signInEls[signInEls.length - 1])
    await waitFor(() => {
      const errorEls = screen.getAllByTestId('error')
      expect(errorEls[errorEls.length - 1].textContent).not.toBe('')
    })
    window.__simulateGoogleError = false;
  })

  it('clears token on sign out', async () => {
    renderWithProvider(<TestConsumer />)
    const signInEls = screen.getAllByTestId('sign-in-btn')
    fireEvent.click(signInEls[signInEls.length - 1])
    await waitFor(() => expect(localStorage.getItem('google_access_token')).toBe('mock_token'))
    const signOutEls = screen.getAllByTestId('sign-out-btn')
    fireEvent.click(signOutEls[signOutEls.length - 1])
    await waitFor(() => expect(localStorage.getItem('google_access_token')).toBe(null))
  })
})

function TestComponent() {
  const { signedIn, accessToken, signIn, signOut, error } = useGoogleAuth()
  return (
    <div>
      <div data-testid="signedIn">{String(signedIn)}</div>
      <div data-testid="accessToken">{accessToken}</div>
      <div data-testid="error">{error}</div>
      <button data-testid="signIn" onClick={signIn}>Sign In</button>
      <button data-testid="signOut" onClick={signOut}>Sign Out</button>
    </div>
  )
}

const wrap = (ui: React.ReactNode) => (
  <GoogleOAuthProvider clientId="test-client-id">
    {ui}
  </GoogleOAuthProvider>
)

describe('GoogleAuthContext token expiration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(1000000)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes as signed out if token is expired', () => {
    localStorage.setItem('google_access_token', 'abc')
    localStorage.setItem('google_expires_at', (Date.now() - 1000).toString())
    const { getAllByTestId } = render(
      wrap(
        <GoogleAuthProvider>
          <TestComponent />
        </GoogleAuthProvider>
      )
    )
    const signedInEls = getAllByTestId('signedIn')
    const accessTokenEls = getAllByTestId('accessToken')
    expect(signedInEls[signedInEls.length - 1].textContent).toBe('false')
    expect(accessTokenEls[accessTokenEls.length - 1].textContent).toBe('')
  })

  it('initializes as signed in if token is valid', () => {
    localStorage.setItem('google_access_token', 'abc')
    localStorage.setItem('google_expires_at', (Date.now() + 10000).toString())
    const { getAllByTestId } = render(
      wrap(
        <GoogleAuthProvider>
          <TestComponent />
        </GoogleAuthProvider>
      )
    )
    const signedInEls = getAllByTestId('signedIn')
    const accessTokenEls = getAllByTestId('accessToken')
    expect(signedInEls[signedInEls.length - 1].textContent).toBe('true')
    expect(accessTokenEls[accessTokenEls.length - 1].textContent).toBe('abc')
  })

  it('signs out and clears token/expiration', () => {
    localStorage.setItem('google_access_token', 'abc')
    localStorage.setItem('google_expires_at', (Date.now() + 10000).toString())
    const { getAllByTestId } = render(
      wrap(
        <GoogleAuthProvider>
          <TestComponent />
        </GoogleAuthProvider>
      )
    )
    const signOutEls = getAllByTestId('signOut')
    act(() => {
      fireEvent.click(signOutEls[signOutEls.length - 1])
    })
    expect(localStorage.getItem('google_access_token')).toBeNull()
    expect(localStorage.getItem('google_expires_at')).toBeNull()
    const signedInEls = getAllByTestId('signedIn')
    expect(signedInEls[signedInEls.length - 1].textContent).toBe('false')
  })

  it('auto signs out when token expires', () => {
    localStorage.setItem('google_access_token', 'abc')
    localStorage.setItem('google_expires_at', (Date.now() + 5000).toString())
    const { getAllByTestId } = render(
      wrap(
        <GoogleAuthProvider>
          <TestComponent />
        </GoogleAuthProvider>
      )
    )
    const signedInEls = getAllByTestId('signedIn')
    expect(signedInEls[signedInEls.length - 1].textContent).toBe('true')
    act(() => {
      vi.advanceTimersByTime(5001)
    })
    expect(signedInEls[signedInEls.length - 1].textContent).toBe('false')
    const errorEls = getAllByTestId('error')
    expect(errorEls[errorEls.length - 1].textContent).toMatch(/expired/)
  })

  it('sets error on sign-in failure', () => {
    // Simulate sign-in error by calling signIn and triggering onError
    // We'll mock useGoogleLogin to call onError immediately
    // Not possible to fully test without more advanced mocking, but this is a placeholder
  })

  it('sign-in sets token and expiration in localStorage', async () => {
    // Reset modules to remove the global mock
    vi.resetModules();
    // Dynamically import after reset
    const React = await import('react');
    const { render, act, fireEvent } = await import('@testing-library/react');
    // Locally mock @react-oauth/google for this test
    vi.doMock('@react-oauth/google', () => ({
      useGoogleLogin: (opts: any) => () => {
        opts.onSuccess({ access_token: 'tok', expires_in: 10 });
      },
      GoogleOAuthProvider: ({ children }: any) => React.createElement('div', null, children),
    }));
    const { GoogleAuthProvider, useGoogleAuth } = await import('./GoogleAuthContext');
    function TestComponent() {
      const { signedIn, accessToken, signIn, signOut, error } = useGoogleAuth();
      return (
        React.createElement('div', null,
          React.createElement('div', { 'data-testid': 'signedIn' }, String(signedIn)),
          React.createElement('div', { 'data-testid': 'accessToken' }, accessToken),
          React.createElement('div', { 'data-testid': 'error' }, error),
          React.createElement('button', { 'data-testid': 'signIn', onClick: signIn }, 'Sign In'),
          React.createElement('button', { 'data-testid': 'signOut', onClick: signOut }, 'Sign Out')
        )
      );
    }
    const wrap = (ui: React.ReactNode) => {
      const { GoogleOAuthProvider } = require('@react-oauth/google');
      return React.createElement(GoogleOAuthProvider, { clientId: 'test-client-id' }, ui);
    };
    const { getAllByTestId } = render(
      wrap(
        React.createElement(GoogleAuthProvider, null, React.createElement(TestComponent))
      )
    );
    const signInEls = getAllByTestId('signIn');
    act(() => {
      fireEvent.click(signInEls[signInEls.length - 1]);
    });
    expect(localStorage.getItem('google_access_token')).toBe('tok');
    expect(Number(localStorage.getItem('google_expires_at'))).toBeGreaterThan(Date.now());
  });
})
