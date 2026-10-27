import { createTheme } from '@mui/material/styles';
import { panel, panelStatus, fonts, radius } from './tokens';

// Tema del panel construido desde los tokens compartidos (frontend/tokens/tokens.js).
// Paleta "Hall de bronce": casi todo es grafito y granito; la pátina marca lo oficial,
// el bronce solo los detalles y el amarillo queda para portería. Los estados nunca decoran.
const c = panel.light;
const s = panelStatus.light;

const display = `"${fonts.display}", "Arial Narrow", system-ui, sans-serif`;
const body = `"${fonts.body}", "Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", sans-serif`;

// Títulos en Archivo: un poco ancho para que se sienta como señalética.
const titulo = (size, weight = 700, stretch = '105%') => ({
  fontFamily: display,
  fontSize: size,
  fontWeight: weight,
  fontStretch: stretch,
  letterSpacing: '-0.01em',
  lineHeight: 1.15,
  textWrap: 'balance',
});

const theme = createTheme({
  palette: {
    // Acción principal en grafito: así ningún color de marca compite con los estados.
    primary: { main: c.ink, contrastText: c.surface, light: c.inkSoft },
    secondary: { main: c.signal, contrastText: c.signalInk, light: c.signalSoft },
    bronce: { main: c.bronze, light: c.bronzeSoft, contrastText: c.surface },
    success: { main: s.ok, light: s.okSoft },
    warning: { main: s.warn, light: s.warnSoft },
    error: { main: s.bad, light: s.badSoft },
    info: { main: c.patina, light: c.patinaSoft, contrastText: c.surface },
    background: { default: c.paper, paper: c.surface },
    text: { primary: c.ink, secondary: c.ink2 },
    divider: c.line,
    // Colores propios de EntreCasas, disponibles como theme.palette.marca.* y theme.palette.estado.*
    marca: { ...c },
    estado: { ...s },
  },
  typography: {
    fontFamily: body,
    fontSize: 14,
    h1: titulo('2.5rem', 800, '112%'),
    h2: titulo('2rem', 800, '110%'),
    h3: titulo('1.75rem', 800, '108%'),
    h4: titulo('1.6rem', 800, '105%'),
    h5: titulo('1.25rem', 700),
    h6: titulo('1.05rem', 700, '100%'),
    overline: {
      fontFamily: display,
      fontStretch: '85%',
      fontWeight: 700,
      letterSpacing: '0.08em',
      lineHeight: 1.6,
    },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: radius.md },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontVariantNumeric: 'tabular-nums' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: radius.md, paddingInline: 14 },
      },
    },
    // Las superficies se separan con bordes, no con sombras.
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: c.line },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: radius.lg } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: { backgroundColor: c.surface, borderBottom: `1px solid ${c.line}` },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, borderRadius: radius.pill },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontFamily: display,
            fontStretch: '90%',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: c.ink2,
            backgroundColor: c.surface,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderColor: c.line } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: c.surface },
        notchedOutline: { borderColor: c.line },
      },
    },
    MuiLink: {
      defaultProps: { color: 'bronce.main' },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: c.ink, fontSize: '0.75rem' } },
    },
  },
});

export default theme;
