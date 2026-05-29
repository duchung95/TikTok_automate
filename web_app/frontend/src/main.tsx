import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { HashRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import '@mantine/core/styles.css'
import { App } from './App'
import { GOOGLE_CLIENT_ID } from './config'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <HashRouter>
        <MantineProvider>
          
            <App />
          
        </MantineProvider>
      </HashRouter>
    </GoogleOAuthProvider>
  </StrictMode>
)
