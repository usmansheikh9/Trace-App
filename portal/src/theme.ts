import { createTheme } from '@mui/material/styles';

/** Trace accent and surfaces, matching the mobile app. */
export const theme = createTheme({
  palette: {
    primary: { main: '#005AB3' },
    background: { default: '#FAF9FE', paper: '#FFFFFF' },
    text: { primary: '#1A1B1F', secondary: '#414754' },
    error: { main: '#BA1A1A' },
    success: { main: '#1B7F3B' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #EEEDF3' } } },
    MuiAppBar: { styleOverrides: { root: { border: 'none' } } },
    MuiDrawer: { styleOverrides: { paper: { border: 'none', borderRight: '1px solid #EEEDF3' } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600, color: '#414754' } } },
  },
});
