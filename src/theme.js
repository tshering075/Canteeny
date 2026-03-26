import { createTheme } from '@mui/material/styles';

const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#E60012',
        light: '#FF3D4A',
        dark: '#B8000E',
        contrastText: '#fff',
      },
      secondary: {
        main: '#1A1A1A',
        light: '#2D2D2D',
        dark: '#0D0D0D',
      },
      ...(mode === 'light'
        ? {
            background: {
              default: '#F2EDE8',
              paper: '#FAF8F5',
            },
            text: {
              primary: '#1A1A1A',
              secondary: '#6B7280',
              disabled: '#9CA3AF',
            },
          }
        : {
            background: {
              default: '#0D0D0D',
              paper: '#1A1A1A',
            },
            text: {
              primary: '#F9FAFB',
              secondary: '#9CA3AF',
              disabled: '#6B7280',
            },
          }),
      success: { main: '#22C55E' },
      warning: { main: '#F59E0B' },
      error: { main: '#EF4444' },
    },
    typography: {
      fontFamily: '"Inter", "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3 },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
          contained: { boxShadow: '0 2px 8px rgba(230, 0, 18, 0.25)' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: mode === 'light' ? '0 2px 12px rgba(0,0,0,0.04)' : '0 2px 12px rgba(0,0,0,0.3)',
            borderRadius: 12,
            transition: 'box-shadow 0.2s ease',
            '&:hover': {
              boxShadow: mode === 'light' ? '0 4px 20px rgba(0,0,0,0.08)' : '0 4px 20px rgba(0,0,0,0.4)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: mode === 'light' ? '0 2px 12px rgba(0,0,0,0.04)' : '0 2px 12px rgba(0,0,0,0.3)',
            borderRadius: 12,
            border: mode === 'light' ? '1px solid rgba(0,0,0,0.04)' : '1px solid rgba(255,255,255,0.08)',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: mode === 'light' ? 'rgba(230, 0, 18, 0.04)' : 'rgba(230, 0, 18, 0.08)' },
            '&.MuiTableRow-root:nth-of-type(even)': {
              backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.02)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { padding: '14px 16px' },
          head: {
            fontWeight: 600,
            backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)',
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: 10, margin: '2px 8px' },
        },
      },
    },
  });

export default getTheme;
