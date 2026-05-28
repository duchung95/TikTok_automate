import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { HashRouter } from 'react-router-dom'
import '@mantine/core/styles.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <MantineProvider>
        <App />
      </MantineProvider>
    </HashRouter>
  </StrictMode>
)
