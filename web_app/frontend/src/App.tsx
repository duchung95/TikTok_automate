import { AppShell, NavLink, Text, Group, Badge, Button } from '@mantine/core'
import { IconPackage, IconPhoto, IconSettings, IconColorPicker } from '@tabler/icons-react'

import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { OrdersPage } from './features/orders/OrdersPage'
import { DesignsPage } from './features/designs/DesignsPage'
import { ColorVariantTable } from './features/color_variants/ColorVariantTable'
import { SettingsPage } from './features/settings/SettingsPage'
import { GoogleAuthProvider, useGoogleAuth } from './features/orders/GoogleAuthContext'
import { APP_VERSION } from './config'

const NAV_ITEMS = [
  { path: '/orders',   label: 'Orders',   icon: IconPackage  },
  { path: '/color-variants', label: 'Color Variants', icon: IconColorPicker },
  { path: '/designs',  label: 'Designs',  icon: IconPhoto    },
  { path: '/settings', label: 'Settings', icon: IconSettings },
  
]


function AppContent() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { signedIn, signIn, signOut } = useGoogleAuth()

  return (
    <AppShell navbar={{ width: 140, breakpoint: 'sm' }} padding="md" header={{ height: 52 }}>
      <AppShell.Header p="sm">
        <Group justify="space-between">
          <Text fw={700} size="lg">🛍 TikTok → FlashPOD v{APP_VERSION}</Text>
          <Group gap="xs">
            <Badge color="orange" variant="light">UAT</Badge>
            {signedIn
              ? <Button size="xs" variant="light" color="red" onClick={signOut}>Đăng xuất Google</Button>
              : <Button size="xs" variant="light" color="blue" onClick={signIn}>Đăng nhập Google</Button>
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
          <Route path="/color-variants" element={<ColorVariantTable />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}

export function App() {
  return (
    <GoogleAuthProvider>
      <AppContent />
    </GoogleAuthProvider>
  )
}