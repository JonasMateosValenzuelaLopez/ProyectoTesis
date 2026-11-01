// ARCHIVO GENERADO: no editar. Fuente: frontend/tokens/tokens.js (node tokens/sync.mjs)
// Tokens de diseño de EntreCasas — dirección visual "Hall de bronce", común al panel y a la app.
// Esta es la fuente única. Después de editarla, ejecuta `node tokens/sync.mjs`
// desde la carpeta frontend para copiarla a web-admin y mobile-residentes.

// Paleta "Hall de bronce" (grafito, granito, pátina y bronce), la misma en el panel y en la app.
// Sale del hall de un edificio chileno: placas de bronce, piso de granito, barandas con pátina.
export const panel = {
  light: {
    paper: '#EEEFEA',        // Granito: fondo general
    surface: '#FFFFFF',
    ink: '#1C211F',          // Grafito: texto y botón principal
    ink2: '#525A56',
    line: '#D8DCD5',         // Divisores y bordes de tarjetas
    lineStrong: '#8C948F',   // Borde de campos y controles (3:1 sobre blanco)
    placeholder: '#6B7470',  // Texto de ejemplo en campos, más claro que lo escrito
    inkSoft: '#E3E5E0',      // Fondo de selección neutra
    sidebar: '#17272A',      // Pátina profunda: barra lateral
    sidebarInk: '#C7D2CD',
    sidebarMuted: '#8A9994',
    sidebarActive: '#223A3D',
    bronze: '#8C4F24',       // Detalle: opción activa, enlaces, placa de unidad, cifra destacada
    bronzeSoft: '#F4E8DC',
    bronzeOnSidebar: '#D9A273',
    patina: '#2B6468',       // Lo oficial: sellos de directiva, comunicados aprobados, exenciones
    patinaSoft: '#DEEBEA',
    signal: '#F2B705',       // Portería (igual que en la app)
    signalInk: '#1A1400',
    signalSoft: '#FDF3D0',
  },
  dark: {
    paper: '#111615',
    surface: '#18201F',
    ink: '#E9ECEA',
    ink2: '#9FAAA6',
    line: '#2A3533',
    lineStrong: '#6A7773',
    placeholder: '#7F8A86',
    inkSoft: '#232C2A',
    sidebar: '#0B1211',
    sidebarInk: '#A9B6B1',
    sidebarMuted: '#6E7B77',
    sidebarActive: '#1A2523',
    bronze: '#E0A877',
    bronzeSoft: '#33261B',
    bronzeOnSidebar: '#E0A877',
    patina: '#7FC0C0',
    patinaSoft: '#16302F',
    signal: '#F2C230',
    signalInk: '#1A1400',
    signalSoft: '#3A3010',
  },
};

// App de residentes: la misma paleta, con el bronce como color de acción para que se sienta
// de casa y no de oficina. La pátina queda para lo oficial y el amarillo para visitas.
export const colors = {
  light: {
    ...panel.light,
    accion: panel.light.bronze,
    accionInk: '#FFFFFF',
    accionSoft: panel.light.bronzeSoft,
  },
  dark: {
    ...panel.dark,
    accion: panel.dark.bronze,
    accionInk: '#18201F',
    accionSoft: panel.dark.bronzeSoft,
  },
};

// Estados del panel, ajustados para no confundirse con el bronce ni la pátina.
export const panelStatus = {
  light: {
    ok: '#2E7031', okSoft: '#DDEFDD',
    warn: '#8F5600', warnSoft: '#FBEFD2',
    bad: '#B3322A', badSoft: '#F8E1DE',
    exempt: '#2B6468', exemptSoft: '#DEEBEA',
  },
  dark: {
    ok: '#6CC08A', okSoft: '#15301E',
    warn: '#E8A84A', warnSoft: '#3A2C10',
    bad: '#F07A6E', badSoft: '#3A1915',
    exempt: '#7FC0C0', exemptSoft: '#16302F',
  },
};

// Estados (pagos, accesos). Son semánticos: nunca se usan como decoración. Iguales en ambas apps.
export const status = panelStatus;

// Sello de cada cargo: familia (directiva, personal, residente) e inicial.
export const roles = {
  administrador: { label: 'Administrador/a', initial: 'A', family: 'staff' },
  conserje: { label: 'Conserjería', initial: 'C', family: 'staff' },
  presidente: { label: 'Presidente/a', initial: 'P', family: 'directiva' },
  tesorero: { label: 'Tesorero/a', initial: 'T', family: 'directiva' },
  secretario: { label: 'Secretario/a', initial: 'S', family: 'directiva' },
  residente: { label: 'Residente', initial: 'R', family: 'residente' },
};

export const fonts = {
  // Archivo: cifras y números de unidad (ancha) y etiquetas (angosta).
  display: 'Archivo',
  // Atkinson Hyperlegible Next: todo el texto de lectura.
  body: 'Atkinson Hyperlegible Next',
  googleFontsUrl:
    'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Atkinson+Hyperlegible+Next:wght@400;500;700&display=swap',
};

export const radius = { sm: 4, md: 8, lg: 12, xl: 16, pill: 999 };

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 };

export const motion = {
  fast: 150,   // hover y foco
  base: 220,   // cambios de estado
  // Curvas: ease-out para lo que entra o responde, ease-in-out para lo que se mueve en pantalla
  ease: { out: [0.23, 1, 0.32, 1], inOut: [0.77, 0, 0.175, 1] },
  // Resorte para presionar botones en la app (Reanimated withSpring)
  pressSpring: { damping: 18, stiffness: 320 },
};

export default { colors, status, panel, panelStatus, roles, fonts, radius, spacing, motion };
