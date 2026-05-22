import { AppShell, NavLink, Text, Group, Badge } from '@mantine/core'
import { IconPackage, IconPhoto, IconSettings } from '@tabler/icons-react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
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

  return (
    <AppShell navbar={{ width: 200, breakpoint: 'sm' }} padding="md" header={{ height: 52 }}>
      <AppShell.Header p="sm">
        <Group justify="space-between">
          <Text fw={700} size="lg">🛍 TikTok → FlashPOD12</Text>
          <Badge color="orange" variant="light">UAT</Badge>
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
