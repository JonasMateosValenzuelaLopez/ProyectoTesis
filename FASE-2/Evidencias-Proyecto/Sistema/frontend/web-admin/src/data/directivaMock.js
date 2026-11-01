// Datos de ejemplo de la Secretaría con las filas de la base: `votaciones`, `votacion_opciones`,
// `votos`, `actas`, `acta_acuerdos` y `contactos`. Son las mismas filas que usa la app de residentes.
// La directiva del directorio sale de las membresías (ver adminMock).
// Ids de ejemplo: votaciones, actas y contactos = red * 100 + n; opciones y acuerdos = id del padre * 10 + n.

const votacion = (id_votacion, id_red, tipo, titulo, descripcion, fecha_inicio, fecha_cierre, quorum, estado, id_usuario_crea) => ({
  id_votacion, id_red, tipo, titulo, descripcion, fecha_inicio, fecha_cierre, quorum, estado, id_usuario_crea,
});
const opciones = (id_votacion, ...textos) => textos.map((texto, i) => ({ id_opcion: id_votacion * 10 + i + 1, id_votacion, texto }));

// Un voto por unidad: `reparto` dice cuántos votos lleva cada opción (en orden) y `unidades` qué unidades votaron.
// En los datos de ejemplo no se guarda qué residente votó por la unidad (`id_usuario` NULL).
function votos(id_votacion, fecha_inicio, reparto, unidades) {
  const elegidas = reparto.flatMap((n, i) => Array(n).fill(id_votacion * 10 + i + 1));
  const inicio = new Date(`${fecha_inicio}T20:00:00`);
  return elegidas.map((id_opcion, i) => {
    const f = new Date(inicio.getTime() + Math.floor(i / 3) * 86400000 + i * 7 * 60000);
    return {
      id_voto: id_votacion * 100 + i + 1, id_votacion, id_opcion, id_unidad: unidades[i], id_usuario: null,
      fecha: new Date(f.getTime() - f.getTimezoneOffset() * 60000).toISOString().slice(0, 19),
    };
  });
}
const rango = (desde, hasta, sin = []) => Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i).filter((n) => !sin.includes(n));

// Asistentes y temas van como texto, uno por línea (columnas `text` de `actas`)
const acta = (id_acta, id_red, numero, tipo, fecha, lugar, asistentes, temas, id_redactor, fecha_publicacion = null, unidades_presentes = null) => ({
  id_acta, id_red, numero, tipo, fecha, lugar, asistentes: asistentes.join('\n'), unidades_presentes, temas: temas.join('\n'),
  estado: fecha_publicacion ? 'Publicada' : 'Borrador', id_redactor, fecha_publicacion,
});
const acuerdos = (id_acta, ...filas) => filas.map(([texto, responsable, plazo = null], i) => ({ id_acuerdo: id_acta * 10 + i + 1, id_acta, texto, responsable, plazo }));
const contacto = (id_contacto, id_red, nombre, detalle, telefono, horario, visible = 1) => ({ id_contacto, id_red, nombre, detalle, telefono, horario, visible });

// 104 Andrea Lagos (secretaria) abre las votaciones y redacta las actas
function lasPalmas() {
  return {
    votaciones: [
      votacion(101, 1, 'Votación', 'Cambio de empresa de seguridad', 'Reemplazar la ronda nocturna actual por Vigilancia Andina, con un costo adicional de $6.500 por casa al mes.', '2026-10-20', '2026-10-31', 60, 'Abierta', 104),
      votacion(102, 1, 'Encuesta', '¿Qué día prefieres para la próxima asamblea?', 'La usaremos para fijar la asamblea de noviembre.', '2026-10-23', '2026-11-03', null, 'Abierta', 104),
      votacion(103, 1, 'Votación', 'Poda de árboles del pasaje', 'Contratar la poda de los 12 árboles del pasaje por $260.000 con cargo al gasto común.', '2026-09-15', '2026-09-25', 60, 'Cerrada', 104),
    ],
    votacion_opciones: [
      ...opciones(101, 'A favor', 'En contra', 'Abstención'),
      ...opciones(102, 'Martes 19:30', 'Jueves 19:30', 'Sábado 11:00'),
      ...opciones(103, 'A favor', 'En contra'),
    ],
    // Las casas 1, 5 y 15 (cuentas de prueba de la app) aún no votan en las abiertas
    votos: [
      ...votos(101, '2026-10-20', [7, 2, 1], rango(1002, 1012, [1005])),
      ...votos(102, '2026-10-23', [3, 2, 1], [1002, 1004, 1007, 1009, 1012, 1014]),
      ...votos(103, '2026-09-15', [11, 1], rango(1001, 1012)),
    ],
    actas: [
      acta(103, 1, 14, 'Reunión de directiva', '2026-10-21', 'Sede social',
        ['Luis Muñoz (Presidente)', 'Marta Rivas (Tesorera)', 'Andrea Lagos (Secretaria)', 'Carlos Ibáñez (Administrador)'],
        ['Falla del portón eléctrico', 'Horario del quincho', 'Morosidad de octubre'], 104),
      acta(102, 1, 13, 'Asamblea ordinaria', '2026-09-28', 'Quincho',
        ['Directiva completa', 'Representantes de 11 casas'],
        ['Cuenta de la tesorería', 'Meta del fondo de reserva', 'Poda de árboles del pasaje'], 104, '2026-09-30T10:00:00', 11),
      acta(101, 1, 12, 'Reunión de directiva', '2026-09-09', 'Sede social',
        ['Luis Muñoz (Presidente)', 'Marta Rivas (Tesorera)', 'Andrea Lagos (Secretaria)'],
        ['Preparación de la asamblea de septiembre'], 104, '2026-09-11T18:00:00'),
    ],
    acta_acuerdos: [
      ...acuerdos(103,
        ['Cotizar con dos proveedores la reparación del motor del portón.', 'Administración', '2026-10-28'],
        ['Enviar a aprobación la norma de horario del quincho.', 'Secretaría', '2026-10-25']),
      ...acuerdos(102,
        ['Mantener la cuota del fondo de reserva en $8.000 hasta llegar a $4.000.000.', 'Tesorería'],
        ['Aprobar la poda de árboles del pasaje por $260.000.', 'Administración', '2026-10-15']),
      ...acuerdos(101, ['Citar a asamblea ordinaria el 28 de septiembre.', 'Secretaría', '2026-09-14']),
    ],
    contactos: [
      contacto(101, 1, 'Administración Ibáñez y Cía.', 'Administración del condominio', '+56 2 2345 6789', 'Lunes a viernes, 9:00 a 18:00'),
      contacto(102, 1, 'Automatismos Sur SpA', 'Mantención del portón eléctrico', '+56 9 8765 4321', 'Urgencias 24 horas'),
      contacto(103, 1, 'Gasfitería Don Hugo', 'Gasfíter de confianza del condominio', '+56 9 5555 1212', 'Lunes a sábado', 0),
    ],
  };
}

// 2077 Paula Reyes (secretaria). La casa 27 (cuenta de prueba de la app) aún no vota.
function villa() {
  return {
    votaciones: [
      votacion(201, 2, 'Votación', 'Instalar alarma comunitaria', 'Alarma con botón en cada casa, financiada con una cuota extraordinaria de $15.000 por casa.', '2026-10-18', '2026-11-08', 50, 'Abierta', 2077),
    ],
    votacion_opciones: opciones(201, 'A favor', 'En contra'),
    votos: votos(201, '2026-10-18', [38, 9], rango(2001, 2048, [2027])),
    actas: [
      acta(201, 2, 31, 'Asamblea ordinaria', '2026-10-04', 'Sede vecinal',
        ['Directiva completa', 'Representantes de 41 casas'],
        ['Reparación del portón de acceso', 'Cuota social 2027'], 2077, '2026-10-06T12:00:00', 41),
    ],
    acta_acuerdos: acuerdos(201, ['Pedir tres cotizaciones para el portón de acceso.', 'Tesorería', '2026-10-20']),
    contactos: [
      contacto(201, 2, 'Plan Cuadrante 14', 'Carabineros del sector', '+56 9 8888 0014', '24 horas'),
    ],
  };
}

// 107 Patricia Olave (administradora): sin votaciones ni actas todavía
function torreAndes() {
  return {
    ...directivaVacia(),
    contactos: [
      contacto(301, 3, 'Conserjería', 'Visitas, encomiendas y llaves de los espacios comunes', '+56 45 221 0890', 'Todos los días, 24 horas'),
      contacto(302, 3, 'Administración Olave', 'Administración del edificio', '+56 9 7123 4567', 'Lunes a viernes, 9:00 a 17:00'),
    ],
  };
}

export function directivaInicial() {
  return { 1: lasPalmas(), 2: villa(), 3: torreAndes() };
}

// Números que siempre aparecen en el directorio de la app; no van en la base.
export const EMERGENCIAS = [
  { nombre: 'Ambulancia (SAMU)', telefono: '131' },
  { nombre: 'Bomberos', telefono: '132' },
  { nombre: 'Carabineros', telefono: '133' },
  { nombre: 'PDI', telefono: '134' },
];

export function directivaVacia() {
  return { votaciones: [], votacion_opciones: [], votos: [], actas: [], acta_acuerdos: [], contactos: [] };
}
