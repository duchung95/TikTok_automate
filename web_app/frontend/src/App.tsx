import { AppShell, NavLink, Text, Group, Badge, Button, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPackage, IconPhoto, IconSettings, IconColorPicker, IconShoppingCartX, IconNote, IconNotebook, IconPaint, IconPhotoCheck, IconPhotoAlt, IconWallpaper, IconPictureInPictureOn } from '@tabler/icons-react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { OrdersPage } from './features/orders/OrdersPage';
import DesignsPage from './features/designs/DesignsPage';
import { ColorVariantTable } from './features/color_variants/ColorVariantTable';
import { SettingsPage } from './features/settings/SettingsPage';
import { GoogleAuthProvider } from './features/context/google_context/GoogleAuthContext';
import { useGoogleAuth } from './features/context/google_context/useGoogleAuth';
import { APP_VERSION } from './config';
import { DesignProvider } from './features/designs/useDesignStore';
import FindUnfullfillComponent from './features/find_unfullfill/FindUnfullfillComponent';
import NoteComponent from './features/notes/NoteComponent';
import AddOrderComponent from './features/add-order/AddOrderComponent';
import AddDesignComponent from './features/add-design/AddDesignComponent';

const NAV_ITEMS = [
  { path: '/orders',   label: 'Orders',   icon: IconPackage  },
  { path: '/color-variants', label: 'Colors', icon: IconColorPicker },
  { path: '/designs',  label: 'Designs',  icon: IconPhoto    },
  { path: '/find-unfulfilled', label: 'Chưa fulfill', icon: IconShoppingCartX },
  { path: '/notes', label: 'Notes', icon: IconNote },
  { path: '/add-order', label: 'Nhập order', icon: IconNotebook},
  { path: '/add-design', label: 'Thêm design', icon: IconPictureInPictureOn},
];
const AppContent = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { signedIn, signIn, signOut } = useGoogleAuth()
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      navbar={{ width: 160, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
      header={{ height: 52 }}
    >
      <AppShell.Header p="sm">
        <Group justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg">HnH v{APP_VERSION}</Text>
          </Group>
          <Group gap="xs">
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
            onClick={() => {navigate(path); toggle();}}
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
          <Route path="/find-unfulfilled" element={<FindUnfullfillComponent />} />
           <Route path="/notes" element={<NoteComponent />} />
          <Route path="/add-order" element={<AddOrderComponent/>}/>
          <Route path="/add-design" element={<AddDesignComponent/>}/>
          
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}

export function App() {
  return (
    <GoogleAuthProvider>
      <DesignProvider>
        <AppContent />
      </DesignProvider>
    </GoogleAuthProvider>
  )
}