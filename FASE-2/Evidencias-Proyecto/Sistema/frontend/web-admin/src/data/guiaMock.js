// P8 · Filas de `guias_comunidad`: lo propio de la guía de bienvenida de cada comunidad.
// Los espacios y contactos de la guía salen de `espacios_comunes` y `contactos`. Son las mismas filas que usa la app.
// `basura_dias` es un SET de MariaDB: texto con los días separados por comas.
export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function guiasIniciales() {
  return {
    1: {
      id_red: 1, mensaje: 'Somos 15 casas y nos gusta conocernos. Cualquier duda, escríbenos o pasa por la administración en horario de oficina.',
      basura_dias: 'Lunes,Miércoles,Viernes', basura_horario: 'Desde las 21:00', basura_lugar: 'Contenedor verde de la entrada, nunca a la vereda',
      reciclaje_lugar: 'Punto limpio junto al quincho', reciclaje_detalle: 'Vidrio, latas, cartón aplastado y plástico 1 y 2', id_usuario_actualiza: 101, fecha_actualizacion: '2026-10-20T10:00:00',
    },
    2: {
      id_red: 2, mensaje: 'La junta de vecinos se reúne el primer jueves de cada mes en la sede. ¡Te esperamos!',
      basura_dias: 'Martes,Sábado', basura_horario: 'El camión municipal pasa en la mañana', basura_lugar: 'Frente a tu casa, la noche anterior',
      reciclaje_lugar: 'Punto verde de la sede vecinal', reciclaje_detalle: 'Vidrio, latas y botellas plásticas', id_usuario_actualiza: 2077, fecha_actualizacion: '2026-09-12T10:00:00',
    },
    3: {
      id_red: 3, mensaje: 'Conserjería atiende las 24 horas. Ante cualquier duda, llama o pasa por el hall.',
      basura_dias: 'Lunes,Martes,Miércoles,Jueves,Viernes,Sábado,Domingo', basura_horario: 'Hasta las 22:00', basura_lugar: 'Shaft de tu piso, junto al ascensor. Bolsas cerradas.',
      reciclaje_lugar: 'Sala de reciclaje, subterráneo −1', reciclaje_detalle: 'Vidrio, cartón y pilas. Pide la llave en conserjería.', id_usuario_actualiza: 107, fecha_actualizacion: '2026-10-01T10:00:00',
    },
  };
}

// Una comunidad nueva parte sin guía: solo se muestran la bienvenida y los contactos
export const guiaVacia = (id_red) => ({
  id_red, mensaje: null, basura_dias: null, basura_horario: null, basura_lugar: null, reciclaje_lugar: null, reciclaje_detalle: null,
  id_usuario_actualiza: null, fecha_actualizacion: null,
});
