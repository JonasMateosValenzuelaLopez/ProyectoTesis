// ARCHIVO GENERADO: no editar. Fuente: frontend/tokens/tokens.js (node tokens/sync.mjs)
// Tokens de diseño de EntreCasas — dirección visual "Placa y plano".
// Esta es la fuente única. Después de editarla, ejecuta `node tokens/sync.mjs`
// desde la carpeta frontend para copiarla a web-admin y mobile-residentes.

export const colors = {
  light: {
    paper: '#F3F4F0',       // Fondo general (gris con leve tono verde)
    surface: '#FFFFFF',     // Tarjetas, formularios
    ink: '#15202B',         // Texto principal
    ink2: '#4E5966',        // Texto secundario
    line: '#DCDFD8',        // Bordes y divisores
    cobalt: '#2643C4',      // Azul placa: acción principal, cargos, contenido oficial
    cobaltInk: '#FFFFFF',   // Texto sobre azul placa
    cobaltSoft: '#E5E9FA',
    signal: '#F2B705',      // Amarillo aviso: visitas, QR, portería
    signalInk: '#1A1400',
    signalSoft: '#FDF3D0',
    sidebar: '#15202B',     // Barra lateral del panel
    sidebarInk: '#C9D1DA',
  },
  dark: {
    paper: '#0F141A',
    surface: '#161D25',
    ink: '#E8ECEF',
    ink2: '#9AA6B2',
    line: '#27313C',
    cobalt: '#7D93FF',
    cobaltInk: '#0F141A',
    cobaltSoft: '#1E2752',
    signal: '#F2C230',
    signalInk: '#1A1400',
    signalSoft: '#3A3010',
    sidebar: '#0B0F14',
    sidebarInk: '#9AA6B2',
  },
};

// Estados (pagos, accesos). Son semánticos: nunca se usan como decoración.
export const status = {
  light: {
    ok: '#1E7A4F', okSoft: '#DDF0E5',       // Pagado, acceso validado
    warn: '#9A5B00', warnSoft: '#FDF3D0',   // Pendiente en plazo, esperando
    bad: '#C2362B', badSoft: '#F8E1DE',     // Con deuda, acceso rechazado
    exempt: '#2643C4', exemptSoft: '#E5E9FA', // Exención en revisión
  },
  dark: {
    ok: '#5CC28E', okSoft: '#13301F',
    warn: '#E8A84A', warnSoft: '#3A3010',
    bad: '#F07A6E', badSoft: '#3A1915',
    exempt: '#7D93FF', exemptSoft: '#1E2752',
  },
};

// Panel web: paleta "Hall de bronce" (grafito, granito, pátina y bronce).
// Sale del hall de un edificio chileno: placas de bronce, piso de granito, barandas con pátina.
// La app de residentes sigue usando `colors` y `status`.
export const panel = {
  light: {
    paper: '#EEEFEA',        // Granito: fondo general
    surface: '#FFFFFF',
    ink: '#1C211F',          // Grafito: texto y botón principal
    ink2: '#525A56',
    line: '#D8DCD5',
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

// Sello de cada cargo: familia (directiva, personal, residente) e inicial.
export const roles = {
  administrador: { label: 'Administrador', initial: 'A', family: 'staff' },
  conserje: { label: 'Conserjería', initial: 'C', family: 'staff' },
  presidente: { label: 'Presidente', initial: 'P', family: 'directiva' },
  tesorero: { label: 'Tesorero', initial: 'T', family: 'directiva' },
  secretario: { label: 'Secretario', initial: 'S', family: 'directiva' },
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
  // Resorte para presionar botones en la app (Reanimated withSpring)
  pressSpring: { damping: 18, stiffness: 320 },
};

export default { colors, status, panel, panelStatus, roles, fonts, radius, spacing, motion };
