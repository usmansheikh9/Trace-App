import { NavLink, Outlet } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import QrCode2 from '@mui/icons-material/QrCode2';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import { useAuth } from '../auth/AuthContext';

const DRAWER_WIDTH = 232;

const NAV = [
  { to: '/sessions', label: 'Sessions', icon: <AccountTreeOutlined /> },
  { to: '/users', label: 'Users', icon: <PeopleAltOutlined /> },
  { to: '/roles', label: 'Roles', icon: <BadgeOutlined /> },
  { to: '/boxes', label: 'Boxes', icon: <Inventory2Outlined /> },
  { to: '/settings', label: 'Settings', icon: <SettingsOutlined /> },
];

export function Layout() {
  const { session, signOut } = useAuth();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        sx={{ zIndex: (t) => t.zIndex.drawer + 1, borderBottom: '1px solid #EEEDF3', boxShadow: 'none' }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <QrCode2 color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Trace <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>Management</Box>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {session?.name}
          </Typography>
          <Button variant="outlined" size="small" onClick={signOut}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
        <Toolbar />
        <List sx={{ px: 1, pt: 2 }}>
          {NAV.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.active': { bgcolor: '#E8F1FB', color: 'primary.main', '& .MuiListItemIcon-root': { color: 'primary.main' } },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 4, minWidth: 0 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
