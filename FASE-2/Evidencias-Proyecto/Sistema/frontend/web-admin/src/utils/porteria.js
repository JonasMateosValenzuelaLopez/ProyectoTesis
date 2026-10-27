// Qué dice la garita al leer un código
export function revisarCodigo(invitaciones, codigo, ahora = new Date()) {
  const limpio = codigo.trim().toUpperCase().replace(/\s/g, '');
  const inv = invitaciones.find((i) => i.codigo.replace('-', '') === limpio.replace('-', ''));
  if (!inv) return { resultado: 'no_existe' };
  if (inv.estado === 'cancelada') return { resultado: 'cancelada', inv };
  if (inv.estado === 'adentro') return { resultado: 'adentro', inv };
  if (inv.estado === 'salio') return { resultado: 'usado', inv };
  // Se acepta hasta 15 minutos antes de la hora de inicio
  if (ahora < new Date(new Date(inv.desde).getTime() - 15 * 60000)) return { resultado: 'temprano', inv };
  if (ahora > new Date(inv.hasta)) return { resultado: 'vencido', inv };
  return { resultado: 'valido', inv };
}
