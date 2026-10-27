import { createTheme } from '@mui/material/styles';
import { panel, panelStatus, fonts, radius, motion } from './tokens';

// Tema del panel construido desde los tokens compartidos (frontend/tokens/tokens.js).
// Paleta "Hall de bronce": casi todo es grafito y granito; la pátina marca lo oficial,
// el bronce solo los detalles y el amarillo queda para portería. Los estados nunca decoran.
const c = panel.light;
const s = panelStatus.light;

const display = `"${fonts.display}", "Arial Narrow", system-ui, sans-serif`;
// Las cifras van en Archivo tabular aunque el texto sea Atkinson: el cero de Atkinson viene tachado
// y en montos y fechas se lee como código. "EC Cifras" solo trae los dígitos (unicode-range).
const body = `"EC Cifras", "${fonts.body}", "Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", sans-serif`;
const curva = (c) => `cubic-bezier(${c.join(', ')})`;

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
      styleOverrides: `
        @font-face {
          font-family: "EC Cifras";
          src: url("/fonts/archivo-latin.woff2") format("woff2");
          font-weight: 400 800;
          font-stretch: 62% 125%;
          font-display: swap;
          unicode-range: U+0030-0039;
        }
        :root {
          --ease-out: ${curva(motion.ease.out)};
          --ease-in-out: ${curva(motion.ease.inOut)};
        }
        body { font-variant-numeric: tabular-nums; }
        .MuiButtonBase-root.Mui-focusVisible { outline: 2px solid ${c.ink}; outline-offset: 2px; }
      `,
    },
    // Sin la onda de Material: la respuesta al presionar es una leve escala, igual que en la app.
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          paddingInline: 14,
          transition: `background-color ${motion.fast}ms ease, border-color ${motion.fast}ms ease, color ${motion.fast}ms ease, transform 160ms var(--ease-out)`,
          '&:active': { transform: 'scale(0.97)' },
          '@media (prefers-reduced-motion: reduce)': { '&:active': { transform: 'none' } },
        },
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
        root: {
          backgroundColor: c.surface,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: c.ink2 },
        },
        // Borde con 3:1 de contraste (WCAG 1.4.11) y ejemplo más claro que lo escrito
        notchedOutline: { borderColor: c.lineStrong, transition: `border-color ${motion.fast}ms ease` },
        input: { '&::placeholder': { color: c.placeholder, opacity: 1 } },
      },
    },
    MuiLink: {
      defaultProps: { color: 'bronce.main' },
    },
    // Interruptor encendido en pátina (lo que la comunidad tiene activo), apagado en gris con borde visible.
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: c.surface,
          '&.Mui-checked': { color: c.surface },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: c.patina, opacity: 1 },
        },
        thumb: { boxShadow: `0 0 0 1px ${c.lineStrong}` },
        track: { backgroundColor: c.lineStrong, opacity: 1, transition: `background-color ${motion.fast}ms ease` },
      },
    },
    // Pasos: los pendientes con borde, el actual en grafito y los terminados en pátina con su check.
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: c.surface,
          border: `1.5px solid ${c.lineStrong}`,
          borderRadius: '50%',
          '& .MuiStepIcon-text': { fill: c.ink2, fontWeight: 700 },
          '&.Mui-active': { color: c.ink, borderColor: c.ink, '& .MuiStepIcon-text': { fill: c.surface } },
          '&.Mui-completed': { color: c.patina, borderColor: c.patina },
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: { color: c.ink2, '&.Mui-active': { color: c.ink, fontWeight: 700 }, '&.Mui-completed': { color: c.ink } },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: c.ink, fontSize: '0.75rem' } },
    },
  },
});

export default theme;
