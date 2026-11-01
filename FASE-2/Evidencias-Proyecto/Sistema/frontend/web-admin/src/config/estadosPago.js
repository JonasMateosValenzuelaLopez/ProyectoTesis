// Estados del cobro de una unidad (cobro_unidades.estado + deuda anterior).
// El color es semántico y se repite en el plano y en los chips.
export const ESTADOS_PAGO = {
  pagado: { texto: 'Pagado', color: 'success' },
  pendiente: { texto: 'Pendiente', color: 'warning' },
  moroso: { texto: 'Con deuda', color: 'error' },
  exencion: { texto: 'Exención en revisión', color: 'info' },
};

// Ocupación de cada unidad, para el plano de Administración
export const ESTADOS_OCUPACION = {
  ocupada: { texto: 'Vive el propietario' },
  arrendada: { texto: 'Arrendada' },
  vacia: { texto: 'Sin residentes' },
};
