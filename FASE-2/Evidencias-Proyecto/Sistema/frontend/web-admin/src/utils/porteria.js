// Qué dice la garita al leer un código
export function revisarCodigo(invitaciones, codigo, ahora = new Date()) {
  const limpio = codigo.trim().toUpperCase().replace(/\s/g, '');
  const inv = invitaciones.find((i) => i.codigo.replace('-', '') === limpio.replace('-', ''));
  if (!inv) return { resultado: 'no_existe' };
  if (inv.estado === 'Cancelada') return { resultado: 'cancelada', inv };
  if (inv.estado === 'Adentro') return { resultado: 'adentro', inv };
  if (inv.estado === 'Salió') return { resultado: 'usado', inv };
  // Se acepta hasta 15 minutos antes de la hora de inicio
  if (ahora < new Date(new Date(inv.fecha_desde).getTime() - 15 * 60000)) return { resultado: 'temprano', inv };
  if (ahora > new Date(inv.fecha_hasta)) return { resultado: 'vencido', inv };
  return { resultado: 'valido', inv };
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
