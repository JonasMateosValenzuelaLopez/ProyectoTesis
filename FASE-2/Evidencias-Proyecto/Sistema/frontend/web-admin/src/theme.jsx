import { createTheme } from '@mui/material/styles';
import { panel, panelStatus, fonts, radius, shadow, motion } from './tokens';

// Tema del panel construido desde los tokens compartidos (frontend/tokens/tokens.js).
// Paleta "Portal": en claro, menú turquesa con texto y acento marino sobre niebla; en oscuro,
// petróleo con letras blancas y el turquesa como acento. Amarillo solo para portería; los estados nunca decoran.
const display = `"${fonts.display}", "Arial Narrow", system-ui, sans-serif`;
const body = `"${fonts.body}", system-ui, -apple-system, "Segoe UI", sans-serif`;
const curva = (c) => `cubic-bezier(${c.join(', ')})`;

// Títulos en Archivo: un poco ancho para que se sienta como señalética.
const titulo = (size, weight = 700, stretch = '105%') => ({
  fontFamily: display,
  fontSize: size,
  fontWeight: weight,
  fontStretch: stretch,
  letterSpacing: '-0.025em',
  lineHeight: 1.1,
  textWrap: 'balance',
});

// Tema para el modo 'light' o 'dark'. Los dos salen de la misma paleta.
export function crearTema(modo = 'light') {
  const c = panel[modo];
  const s = panelStatus[modo];
  const sh = shadow[modo];
  const oscuro = modo === 'dark';
  return createTheme({
    palette: {
      mode: modo,
      // Acción principal en marino: así ningún color de marca compite con los estados.
      primary: { main: c.ink, contrastText: c.surface, light: c.inkSoft },
      secondary: { main: c.signal, contrastText: c.signalInk, light: c.signalSoft },
      bronce: { main: c.bronze, light: c.bronzeSoft, contrastText: c.surface },
      agua: { main: c.agua, light: c.aguaSoft, contrastText: c.surface },
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
      h4: titulo('1.85rem', 800, '108%'),
      h5: titulo('1.25rem', 700),
      h6: titulo('1.05rem', 700, '102%'),
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
    shadows: ['none', sh.card, sh.card, sh.raised, ...Array(21).fill(sh.raised)],
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          :root {
            --ease-out: ${curva(motion.ease.out)};
            --ease-in-out: ${curva(motion.ease.inOut)};
          }
          body { font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased; }
          .MuiButtonBase-root.Mui-focusVisible { outline: 2px solid ${c.ink}; outline-offset: 2px; }
          .MuiInputLabel-root.Mui-focused:not(.Mui-error) { color: ${c.patina}; }
          /* Cada vista entra con un leve ascenso: dice "cambiaste de lugar" sin hacer esperar */
          @keyframes ec-entrar { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
          .ec-vista { animation: ec-entrar 220ms var(--ease-out) both; }
          @media (prefers-reduced-motion: reduce) { .ec-vista { animation: none; } }
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
            paddingInline: 16,
            minHeight: 40,
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
          // En claro las superficies flotan con una sombra cálida; en oscuro, con un borde fino.
          outlined: oscuro ? { borderColor: c.line } : { border: 0, boxShadow: sh.card },
        },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: { root: { borderRadius: radius.xl } },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: {
          root: { backgroundColor: c.paper, borderBottom: `1px solid ${c.line}` },
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
            borderRadius: radius.md,
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: c.ink2 },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: c.patina, borderWidth: 2 },
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
      // Pasos: los pendientes con borde, el actual en marino y los terminados en pátina con su check.
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
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: radius.xl, boxShadow: sh.raised } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, '&.Mui-selected': { backgroundColor: c.ink, color: c.surface, '&:hover': { backgroundColor: c.ink } } },
        },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { backgroundColor: c.ink, color: c.surface, fontSize: '0.75rem' } },
      },
    },
  });
}

export default crearTema('light');
