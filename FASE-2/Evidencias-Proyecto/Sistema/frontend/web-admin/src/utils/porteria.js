// Qué dice la garita al leer un código
// Reglas de portería, las mismas de la API (reglas-accesos.ts y los DTO)
export const TOLERANCIA_ANTICIPO_MIN = 15;
// Una llegada sin invitación espera la respuesta del residente 30 minutos; después expira
export const VENTANA_PENDIENTE_MIN = 30;
export const MIN_NOMBRE_VISITA = 2;
export const MAX_NOMBRE_VISITA = 100;
export const PATENTE = /^[A-Z0-9]{4,8}$/;
export const normalizarPatente = (texto) => texto.toUpperCase().replace(/[\s.·-]/g, '');
export const expiraEn = (a) => new Date(a.fecha_creacion).getTime() + VENTANA_PENDIENTE_MIN * 60000;

// Código «EC-XXXX-XXXX»: se acepta con o sin guiones, con o sin «EC» y en minúsculas.
// Devuelve null si no tiene la forma de un código.
export function normalizarCodigo(valor) {
  const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cuerpo = limpio.length === 10 && limpio.startsWith('EC') ? limpio.slice(2) : limpio;
  return cuerpo.length === 8 ? `EC-${cuerpo.slice(0, 4)}-${cuerpo.slice(4)}` : null;
}

// Como la API (resultadoValidacion): `invitanteVigente(inv)` dice si quien invitó sigue viviendo en la
// vivienda con acceso a la comunidad. Se acepta hasta 15 minutos antes de la hora de inicio.
export function revisarCodigo(invitaciones, codigo, invitanteVigente, ahora = new Date()) {
  const normal = normalizarCodigo(codigo);
  const inv = normal && invitaciones.find((i) => i.codigo === normal);
  if (!inv) return { resultado: 'no_existe' };
  if (inv.estado === 'Adentro') return { resultado: 'adentro', inv };
  if (inv.estado === 'Salió') return { resultado: 'usado', inv };
  if (inv.estado === 'Cancelada') return { resultado: 'cancelada', inv };
  if (!invitanteVigente(inv)) return { resultado: 'sin_invitante', inv };
  if (ahora < new Date(new Date(inv.fecha_desde).getTime() - TOLERANCIA_ANTICIPO_MIN * 60000)) return { resultado: 'temprano', inv };
  if (ahora >= new Date(inv.fecha_hasta)) return { resultado: 'vencido', inv };
  return { resultado: 'valido', inv };
}

// Los mensajes de la API cuando una invitación no deja pasar
export const MENSAJE_RESULTADO = {
  temprano: 'Todavía no es su hora: la invitación aún no comienza',
  vencido: 'La invitación está vencida',
  usado: 'Este código ya se usó',
  adentro: 'La visita ya está adentro',
  cancelada: 'La invitación fue cancelada',
  sin_invitante: 'Quien invitó ya no vive en la vivienda o no tiene acceso a la comunidad',
  no_existe: 'Código no encontrado',
};

// Lo que valida la API al registrar una visita sin invitación
export function errorVisita({ persona, patente }) {
  const nombre = persona.trim().replace(/\s+/g, ' ');
  if (nombre.length < MIN_NOMBRE_VISITA) return { persona: `El nombre debe tener al menos ${MIN_NOMBRE_VISITA} caracteres` };
  if (nombre.length > MAX_NOMBRE_VISITA) return { persona: `El nombre no puede superar ${MAX_NOMBRE_VISITA} caracteres` };
  const p = normalizarPatente(patente);
  if (p && !PATENTE.test(p)) return { patente: 'La patente debe tener entre 4 y 8 letras o números, sin espacios' };
  return null;
}

// Teléfono del residente para que la garita le escriba o le llame. Con la API vendrá de su perfil;
// aquí se usan los de las cuentas de prueba y, para el resto, uno ficticio según la unidad.
const TELEFONOS = { 1001: '+56 9 6123 4501', 1005: '+56 9 6123 4505', 3603: '+56 9 6123 4603', 2027: '+56 9 6123 4027' };
export const telefonoResidente = (u) => TELEFONOS[u.id_unidad] ?? `+56 9 6123 4${String(u.numero_identificador).padStart(3, '0').slice(-3)}`;

// Solo dígitos con el 56 adelante, como lo piden wa.me y tel:
export const soloDigitos = (telefono) => {
  const d = telefono.replace(/\D/g, '');
  return d.startsWith('56') ? d : `56${d}`;
};
