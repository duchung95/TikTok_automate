import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { GoogleAuthProvider, useGoogleAuth } from '../src/features/orders/GoogleAuthContext'

function TestConsumer() {
  const { signedIn, accessToken, signIn, signOut, error } = useGoogleAuth()
  return (
    <div>
      <div data-testid="signed-in">{String(signedIn)}</div>
      <div data-testid="access-token">{accessToken || ''}</div>
      <div data-testid="error">{error || ''}</div>
      <button onClick={() => signIn('mock_token')}>Sign In</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}

describe('GoogleAuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('provides default state', () => {
    render(
      <GoogleAuthProvider>
        <TestConsumer />
      </GoogleAuthProvider>
    )
    expect(screen.getByTestId('signed-in').textContent).toBe('false')
    expect(screen.getByTestId('access-token').textContent).toBe('')
  })

  it('signs in and updates state', async () => {
    render(
      <GoogleAuthProvider>
        <TestConsumer />
      </GoogleAuthProvider>
    )
    fireEvent.click(screen.getByText('Sign In'))
    await waitFor(() => {
      expect(screen.getByTestId('signed-in').textContent).toBe('true')
      expect(screen.getByTestId('access-token').textContent).toBe('mock_token')
    })
  })

  it('signs out and clears state', async () => {
    render(
      <GoogleAuthProvider>
        <TestConsumer />
      </GoogleAuthProvider>
    )
    fireEvent.click(screen.getByText('Sign In'))
    await waitFor(() => expect(screen.getByTestId('signed-in').textContent).toBe('true'))
    fireEvent.click(screen.getByText('Sign Out'))
    await waitFor(() => {
      expect(screen.getByTestId('signed-in').textContent).toBe('false')
      expect(screen.getByTestId('access-token').textContent).toBe('')
    })
  })

  it('persists token in localStorage', async () => {
    render(
      <GoogleAuthProvider>
        <TestConsumer />
      </GoogleAuthProvider>
    )
    fireEvent.click(screen.getByText('Sign In'))
    await waitFor(() => expect(localStorage.getItem('google_access_token')).toBe('mock_token'))
  })

  it('handles sign-in failure', async () => {
    // Simulate error in signIn
    const ErrorConsumer = () => {
      const { signIn, error } = useGoogleAuth()
      return (
        <>
          <button onClick={() => signIn(undefined as any)}>Sign In</button>
          <div data-testid="error">{error || ''}</div>
        </>
      )
    }
    render(
      <GoogleAuthProvider>
        <ErrorConsumer />
      </GoogleAuthProvider>
    )
    fireEvent.click(screen.getByText('Sign In'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).not.toBe(''))
  })

  it('clears token on sign out', async () => {
    render(
      <GoogleAuthProvider>
        <TestConsumer />
      </GoogleAuthProvider>
    )
    fireEvent.click(screen.getByText('Sign In'))
    await waitFor(() => expect(localStorage.getItem('google_access_token')).toBe('mock_token'))
    fireEvent.click(screen.getByText('Sign Out'))
    await waitFor(() => expect(localStorage.getItem('google_access_token')).toBe(null))
  })
})
