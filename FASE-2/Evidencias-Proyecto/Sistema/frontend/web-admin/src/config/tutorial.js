import { SECCIONES } from './navegacion';
import { PLATAFORMA, RolUsuario as R, rolesEfectivos } from './roles';
import { SECCIONES_PLATAFORMA } from './plataforma';
import { tieneModulo } from './modulos';

// Pasos del tutorial del panel. Cada paso tiene su escena animada (components/tutorial/Escenas.jsx),
// la ruta del menú donde se hace (para decir «Dónde está») y, si corresponde, el módulo que necesita.
const PASOS = {
  pendientes: { ruta: '/panel', titulo: 'Lo pendiente, primero', texto: 'Inicio junta lo que espera una respuesta tuya: solicitudes, reportes y visitas.' },
  residentes: { ruta: '/panel/residentes', titulo: 'Aprobar a quien llega', texto: 'Cuando alguien se muda, pide acceso desde la app. Revisas su vivienda y lo apruebas.' },
  moderar: { ruta: '/panel/muro', modulo: 'muro', titulo: 'Cuidar el muro', texto: 'Si los vecinos reportan una publicación, decides si se oculta o si los reportes se descartan.' },
  reservas: { ruta: '/panel/reservas', modulo: 'reservas', titulo: 'Reservas de espacios', texto: 'Ves quién reservó cada espacio y puedes cancelar si hace falta.' },
  guia: { ruta: '/panel/guia', titulo: 'La guía de bienvenida', texto: 'Lo que ve un residente nuevo al entrar: días de basura, espacios y contactos.' },
  modulos: { ruta: '/panel/modulos', titulo: 'Encender módulos', texto: 'Cada comunidad usa solo lo que necesita. Al encender un módulo aparece en la app.' },
  aprobar: { ruta: '/panel/aprobaciones', titulo: 'Tu visto bueno', texto: 'Los gastos sobre el umbral y los comunicados oficiales esperan tu aprobación.' },
  bitacora: { ruta: '/panel/bitacora', modulo: 'administrador_externo', titulo: 'Todo queda anotado', texto: 'Ves cada acción de la administración, con fecha y hora.' },
  votaciones: { ruta: '/panel/votaciones', modulo: 'votaciones', titulo: 'Votaciones con quórum', texto: 'Cada vivienda vota una vez y ves en vivo si se alcanza el quórum.' },
  comunicado: { ruta: '/panel/muro', modulo: 'muro', titulo: 'Comunicados oficiales', texto: 'Escribes el comunicado y la Presidencia lo aprueba antes de publicarse.' },
  actas: { ruta: '/panel/actas', modulo: 'votaciones', titulo: 'El libro de actas', texto: 'Asistentes y acuerdos de cada asamblea, a la vista de todos.' },
  directorio: { ruta: '/panel/directorio', titulo: 'Contactos útiles', texto: 'Los teléfonos de la comunidad. Tú eliges cuáles ven los residentes.' },
  cobro: { ruta: '/panel/finanzas', modulo: 'cobros', titulo: 'Emitir un cobro', texto: 'Un cobro llega a todas las unidades y cada una recibe un correo.' },
  validar: { ruta: '/panel/finanzas', modulo: 'cobros', titulo: 'Validar transferencias', texto: 'Los residentes avisan que transfirieron. Revisas el banco y lo marcas pagado.' },
  morosidad: { ruta: '/panel/morosidad', modulo: 'cobros', titulo: 'Morosidad sin incomodar', texto: 'Ves quién debe y cuánto, y les recuerdas por correo con un clic.' },
  exenciones: { ruta: '/panel/exenciones', modulo: 'cobros', titulo: 'Exenciones', texto: 'Una vivienda puede pedir no pagar un cobro. Tú decides con la Presidencia.' },
  reportes: { ruta: '/panel/reportes', modulo: 'cobros', titulo: 'Cuentas claras', texto: 'Ingresos y egresos por mes, listos para mostrar en la asamblea.' },
  qr: { ruta: '/panel', modulo: 'invitaciones_qr', titulo: 'Visitas con QR', texto: 'Escaneas el código de la invitación y registras el ingreso.' },
  sinCodigo: { ruta: '/panel', titulo: 'Llegó sin código', texto: 'Le preguntas al residente desde el panel y él responde en la app.' },
  espacios: { ruta: '/panel/espacios', modulo: 'reservas', titulo: 'Entregar y recibir espacios', texto: 'Entregas el espacio reservado y al recibirlo anotas cómo quedó.' },
  crear: { ruta: '/plataforma/nueva', titulo: 'Crear una comunidad', texto: 'Eliges el tipo, armas sus unidades e invitas al primer responsable.' },
  suspender: { ruta: '/plataforma', titulo: 'Suspender y reactivar', texto: 'Si una comunidad deja de usar EntreCasas, la suspendes sin borrar sus datos.' },
};

// Orden de los pasos de cada cargo
const POR_CARGO = {
  [R.ADMINISTRADOR]: ['pendientes', 'residentes', 'moderar', 'reservas', 'guia', 'modulos'],
  [R.PRESIDENTE]: ['aprobar', 'bitacora', 'votaciones'],
  [R.TESORERO]: ['cobro', 'validar', 'morosidad', 'exenciones', 'reportes'],
  [R.SECRETARIO]: ['comunicado', 'votaciones', 'actas', 'directorio', 'guia'],
  [R.CONSERJE]: ['qr', 'sinCodigo', 'espacios'],
  [PLATAFORMA]: ['crear', 'suspender'],
};

const MENU = [...SECCIONES, ...SECCIONES_PLATAFORMA]
  .flatMap((s) => s.items.map((i) => ({ ruta: i.ruta, donde: `${s.titulo} › ${i.texto}` })));

// Pasos para un cargo en una comunidad: los de sus cargos efectivos (la Presidenta de una villa sin
// administración también ve los de administración), sin repetir y solo con los módulos encendidos.
export function pasosTutorial(cargo, comunidad) {
  const cargos = cargo === PLATAFORMA ? [PLATAFORMA] : rolesEfectivos(cargo, comunidad);
  const claves = [...new Set(cargos.flatMap((c) => POR_CARGO[c] ?? []))];
  return claves
    .map((clave) => ({ clave, ...PASOS[clave], donde: MENU.find((m) => m.ruta === PASOS[clave].ruta)?.donde }))
    .filter((p) => !p.modulo || tieneModulo(comunidad, p.modulo));
}
