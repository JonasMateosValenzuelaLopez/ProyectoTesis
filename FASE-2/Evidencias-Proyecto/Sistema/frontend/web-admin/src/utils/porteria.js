// Reglas de portería, las mismas de la API (reglas-accesos.ts y los DTO)
export const TOLERANCIA_ANTICIPO_MIN = 15;
// Una llegada sin invitación espera la respuesta del residente 30 minutos; después expira
export const VENTANA_PENDIENTE_MIN = 30;
export const MIN_NOMBRE_VISITA = 2;
export const MAX_NOMBRE_VISITA = 100;
export const PATENTE = /^[A-Z0-9]{4,8}$/;
export const normalizarPatente = (texto) => texto.toUpperCase().replace(/[\s.·-]/g, '');
// Momento en que expira una llegada pendiente (`llegada` del acceso)
export const expiraEn = (acceso) => new Date(acceso.llegada).getTime() + VENTANA_PENDIENTE_MIN * 60000;

// Lo que pasa con un código según la API (resultadoValidacion) y los mensajes de MENSAJE_RESULTADO
export const RESULTADOS = {
  valido: { titulo: 'Puede ingresar', color: 'success' },
  temprano: { titulo: 'Todavía no es su hora', color: 'warning' },
  vencido: { titulo: 'Invitación vencida', color: 'error' },
  usado: { titulo: 'Este código ya se usó', color: 'error' },
  adentro: { titulo: 'Ya está adentro', color: 'warning' },
  cancelada: { titulo: 'Invitación cancelada', color: 'error' },
  sin_invitante: { titulo: 'Quien invitó ya no vive ahí', color: 'error' },
  no_existe: { titulo: 'Código no encontrado', color: 'error' },
};

// Lo que valida la API al registrar una visita sin invitación
export function errorVisita({ nombre, patente }) {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  if (limpio.length < MIN_NOMBRE_VISITA) return { nombre: `El nombre debe tener al menos ${MIN_NOMBRE_VISITA} caracteres` };
  if (limpio.length > MAX_NOMBRE_VISITA) return { nombre: `El nombre no puede superar ${MAX_NOMBRE_VISITA} caracteres` };
  const p = normalizarPatente(patente);
  if (p && !PATENTE.test(p)) return { patente: 'La patente debe tener entre 4 y 8 letras o números, sin espacios' };
  return null;
}

// Solo dígitos con el 56 adelante, como lo piden wa.me y tel:
export const soloDigitos = (telefono) => {
  const d = telefono.replace(/\D/g, '');
  return d.startsWith('56') ? d : `56${d}`;
};
