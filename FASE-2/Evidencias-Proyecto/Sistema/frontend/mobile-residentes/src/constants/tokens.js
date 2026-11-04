// ARCHIVO GENERADO: no editar. Fuente: frontend/tokens/tokens.js (node tokens/sync.mjs)
// Tokens de diseño de EntreCasas — dirección visual "Portal", común al panel y a la app.
// Esta es la fuente única. Después de editarla, ejecuta `node tokens/sync.mjs`
// desde la carpeta frontend para copiarla a web-admin y mobile-residentes.

// Paleta "Portal", elegida por Jonas el 2 de noviembre de 2026:
// - Claro "Marino": menú y portada en turquesa #66B1B4, texto y acento azul marino, fondo niebla.
// - Oscuro "Petróleo y negro" (A1): contenido casi negro, menú petróleo, letras blancas y el turquesa como acento.
// Los nombres de los tokens no cambian (bronze = acento, sidebar = menú), así ningún componente cambia de lógica.
export const panel = {
  light: {
    paper: '#F3F6F6',        // Niebla: fondo de trabajo
    surface: '#FFFFFF',
    ink: '#16333D',          // Azul marino: texto y botón principal
    ink2: '#4E6168',
    line: '#DFE6E7',
    lineStrong: '#7F9196',   // Borde de campos y controles (3:1 sobre blanco)
    placeholder: '#6A7B80',
    inkSoft: '#E7EEEF',
    sidebar: '#66B1B4',      // Turquesa: menú lateral, portada de la app y panel de marca
    sidebarInk: '#0E2630',   // Sobre el turquesa el texto va en marino (el blanco queda en 2.5:1)
    sidebarStrong: '#0A1C24',
    sidebarMuted: '#163A44',
    sidebarActive: '#94CACC',
    sidebarHover: 'rgba(255, 255, 255, 0.2)',
    sidebarBorder: '#66B1B4',
    sidebarDot: 'rgba(255, 255, 255, 0.45)', // Casas apagadas del plano de marca
    placaSidebar: '#16333D', // Placa "EC" marino sobre el turquesa
    placaSidebarInk: '#FFFFFF',
    bronze: '#16333D',       // Acento: placa de unidad, enlaces, cifras destacadas y acción de la app
    bronzeSoft: '#E2ECEF',
    bronzeOnSidebar: '#16333D',
    patina: '#2F7F83',       // Lo oficial: sellos de directiva, comunicados aprobados, exenciones
    patinaSoft: '#DDEFEF',
    agua: '#2F7F83',
    aguaSoft: '#DDEFEF',
    signal: '#F2B705',       // Portería (igual que en la app)
    signalInk: '#1A1400',
    signalSoft: '#FDF3D0',
  },
  dark: {
    paper: '#0B0F10',        // Casi negro
    surface: '#141B1D',
    ink: '#F2F6F6',          // Letras blancas
    ink2: '#A3B4B6',
    line: '#24302F',
    lineStrong: '#5A6E70',
    placeholder: '#82999B',
    inkSoft: '#1B2527',
    sidebar: '#0B2E32',      // Petróleo en el menú
    sidebarInk: '#B5D6D7',
    sidebarStrong: '#FFFFFF',
    sidebarMuted: '#7FB2B4',
    sidebarActive: '#14444A',
    sidebarHover: 'rgba(255,255,255,0.06)',
    sidebarBorder: '#0B2E32',
    sidebarDot: 'rgba(102,177,180,0.35)',
    placaSidebar: '#66B1B4', // El turquesa como acento brillante
    placaSidebarInk: '#072226',
    bronze: '#66B1B4',
    bronzeSoft: '#15363A',
    bronzeOnSidebar: '#66B1B4',
    patina: '#8FD0D2',
    patinaSoft: '#123236',
    agua: '#8FD0D2',
    aguaSoft: '#123236',
    signal: '#F2C230',
    signalInk: '#1A1400',
    signalSoft: '#3A3010',
  },
};

// App de residentes: la misma paleta. El acento (marino en claro, turquesa en oscuro) queda para
// enlaces e íconos, los botones van en turquesa, la pátina para lo oficial y el amarillo para visitas.
export const colors = {
  light: {
    ...panel.light,
    accion: panel.light.bronze,
    accionInk: '#FFFFFF',
    accionSoft: panel.light.bronzeSoft,
    // Botones principales en turquesa con texto marino (6:1); el secundario usa el turquesa oficial
    // para borde y texto sobre blanco (4.6:1). El marino queda para íconos, enlaces y la placa.
    boton: '#66B1B4',
    botonInk: '#0E2630',
    botonBorde: panel.light.patina,
  },
  dark: {
    ...panel.dark,
    accion: panel.dark.bronze,
    accionInk: '#072226',
    accionSoft: panel.dark.bronzeSoft,
    boton: '#66B1B4',
    botonInk: '#072226',
    botonBorde: '#66B1B4',
  },
};

// Estados del panel, ajustados para no confundirse con el acento ni la pátina.
export const panelStatus = {
  light: {
    ok: '#2E7031', okSoft: '#DDEFDD',
    warn: '#8F5600', warnSoft: '#FBEFD2',
    bad: '#B4233C', badSoft: '#FBE4E7',
    exempt: '#2F7F83', exemptSoft: '#DDEFEF',
  },
  dark: {
    ok: '#6CC08A', okSoft: '#143A2A',
    warn: '#E8A84A', warnSoft: '#3A3418',
    bad: '#F2788A', badSoft: '#3E2229',
    exempt: '#8FD0D2', exemptSoft: '#14403F',
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
  // Una sola familia, Archivo, en dos anchos: ancha y pesada para cifras, títulos y placas;
  // normal para leer. Sin el cero tachado que tenía Atkinson en montos, RUT y horas.
  display: 'Archivo',
  body: 'Archivo',
  googleFontsUrl:
    'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap',
};

export const radius = { sm: 6, md: 12, lg: 16, xl: 24, pill: 999 };

// Profundidad: en claro, las tarjetas flotan con una sombra fría muy suave en vez de un borde duro.
// En oscuro no hay sombra que se vea: ahí se separan con un borde fino.
export const shadow = {
  light: {
    card: '0 1px 2px rgba(16, 40, 48, 0.04), 0 4px 16px rgba(16, 40, 48, 0.05)',
    raised: '0 2px 4px rgba(16, 40, 48, 0.05), 0 12px 32px rgba(16, 40, 48, 0.10)',
  },
  dark: { card: 'none', raised: '0 12px 32px rgba(0, 0, 0, 0.45)' },
};

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 };

export const motion = {
  fast: 150,   // hover y foco
  base: 220,   // cambios de estado
  // Curvas: ease-out para lo que entra o responde, ease-in-out para lo que se mueve en pantalla
  ease: { out: [0.23, 1, 0.32, 1], inOut: [0.77, 0, 0.175, 1] },
  // Resorte para presionar botones en la app (Reanimated withSpring)
  pressSpring: { damping: 18, stiffness: 320 },
};

export default { colors, status, panel, panelStatus, roles, fonts, radius, shadow, spacing, motion };
