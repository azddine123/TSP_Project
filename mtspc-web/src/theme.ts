/**
 * THÈME MUI — Moderne & Simple
 * Dark mode propre avec polices système
 */
import { createTheme, alpha } from '@mui/material';

const BLUE    = '#4A90D9';
const SUCCESS = '#34C78A';
const WARNING = '#F5A623';
const ERROR   = '#E05C5C';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: BLUE,    light: '#78B4E8', dark: '#2B6CB0' },
    success:   { main: SUCCESS },
    warning:   { main: WARNING },
    error:     { main: ERROR },
    background: {
      default: '#111827',
      paper:   '#1F2937',
    },
    text: {
      primary:   '#F3F4F6',
      secondary: '#9CA3AF',
      disabled:  '#4B5563',
    },
    divider: 'rgba(255,255,255,0.08)',
  },

  typography: {
    fontFamily: [
      '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
      'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif',
    ].join(','),
    h4: { fontWeight: 700, letterSpacing: '-0.5px' },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    caption: { fontFamily: '"Courier New", Courier, monospace', fontSize: '0.72rem' },
  },

  shape: { borderRadius: 10 },

  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1F2937',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 1px 8px rgba(0,0,0,0.4)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#1F2937',
          border: '1px solid rgba(255,255,255,0.06)',
        },
        elevation2: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none', backgroundColor: '#2B6CB0' },
        },
        outlined: {
          '&:hover': { backgroundColor: alpha(BLUE, 0.08) },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.72rem', borderRadius: 6 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
            '&.Mui-focused fieldset': { borderColor: BLUE },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: '#1F2937', backgroundImage: 'none' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { backgroundColor: '#1F2937', border: '1px solid rgba(255,255,255,0.08)' },
      },
    },
  },
});

export default theme;
