import { AppShell, NavLink, Text, Group, Badge, Button } from '@mantine/core'
import { IconPackage, IconPhoto, IconSettings } from '@tabler/icons-react'
import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { saveAccessToken, clearAccessToken, isSignedIn } from './features/orders/googleSheetExport'
import { OrdersPage } from './features/orders/OrdersPage'
import { DesignsPage } from './features/designs/DesignsPage'
import { SettingsPage } from './features/settings/SettingsPage'

const NAV_ITEMS = [
  { path: '/orders',   label: 'Orders',   icon: IconPackage  },
  { path: '/designs',  label: 'Designs',  icon: IconPhoto    },
  { path: '/settings', label: 'Settings', icon: IconSettings },
]

export function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [signedIn, setSignedIn] = useState(isSignedIn())

  const login = useGoogleLogin({
    onSuccess: ({ access_token }) => {
      saveAccessToken(access_token)
      setSignedIn(true)
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  })

  const handleSignOut = () => {
    clearAccessToken()
    setSignedIn(false)
  }

  return (
    <AppShell navbar={{ width: 140, breakpoint: 'sm' }} padding="md" header={{ height: 52 }}>
        <AppShell.Header p="sm">
          <Group justify="space-between">
            <Text fw={700} size="lg">🛍 TikTok → FlashPOD</Text>
            <Group gap="xs">
              <Badge color="orange" variant="light">UAT</Badge>
              {signedIn
                ? <Button size="xs" variant="light" color="red" onClick={handleSignOut}>Đăng xuất Google</Button>
                : <Button size="xs" variant="light" color="blue" onClick={() => login()}>Đăng nhập Google</Button>
              }
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="sm">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              label={label}
              leftSection={<Icon size={18} />}
              active={pathname === path || (pathname === '/' && path === '/orders')}
              onClick={() => navigate(path)}
            />
          ))}
        </AppShell.Navbar>

        <AppShell.Main>
          <Routes>
            <Route path="/" element={<OrdersPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/designs" element={<DesignsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AppShell.Main>
      </AppShell>
  )
}