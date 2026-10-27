// Datos de ejemplo de la Secretaría, con la forma del modelo propuesto:
// actas (con asistentes y acuerdos), votaciones, votacion_opciones y contactos del directorio oficial.
// La directiva del directorio sale de las membresías (ver adminMock).
// Los votos van por unidad: una unidad, un voto (lo emite un residente desde la app).
function lasPalmas() {
  return {
    actas: [
      {
        id: 'ac3', numero: 14, tipo: 'Reunión de directiva', fecha: '2026-10-21', lugar: 'Sede social', estado: 'borrador',
        asistentes: ['Luis Muñoz (Presidente)', 'Marta Rivas (Tesorera)', 'Andrea Lagos (Secretaria)', 'Carlos Ibáñez (Administrador)'],
        temas: ['Falla del portón eléctrico', 'Horario del quincho', 'Morosidad de octubre'],
        acuerdos: [
          { texto: 'Cotizar con dos proveedores la reparación del motor del portón.', responsable: 'Administración', plazo: '2026-10-28' },
          { texto: 'Enviar a aprobación la norma de horario del quincho.', responsable: 'Secretaría', plazo: '2026-10-25' },
        ],
        redactadaPor: 'Andrea Lagos',
      },
      {
        id: 'ac2', numero: 13, tipo: 'Asamblea ordinaria', fecha: '2026-09-28', lugar: 'Quincho', estado: 'publicada', unidadesPresentes: 11,
        asistentes: ['Directiva completa', 'Representantes de 11 casas'],
        temas: ['Cuenta de la tesorería', 'Meta del fondo de reserva', 'Poda de árboles del pasaje'],
        acuerdos: [
          { texto: 'Mantener la cuota del fondo de reserva en $8.000 hasta llegar a $4.000.000.', responsable: 'Tesorería', plazo: '' },
          { texto: 'Aprobar la poda de árboles del pasaje por $260.000.', responsable: 'Administración', plazo: '2026-10-15' },
        ],
        redactadaPor: 'Andrea Lagos', publicadaEn: '2026-09-30',
      },
      {
        id: 'ac1', numero: 12, tipo: 'Reunión de directiva', fecha: '2026-09-09', lugar: 'Sede social', estado: 'publicada',
        asistentes: ['Luis Muñoz (Presidente)', 'Marta Rivas (Tesorera)', 'Andrea Lagos (Secretaria)'],
        temas: ['Preparación de la asamblea de septiembre'],
        acuerdos: [{ texto: 'Citar a asamblea ordinaria el 28 de septiembre.', responsable: 'Secretaría', plazo: '2026-09-14' }],
        redactadaPor: 'Andrea Lagos', publicadaEn: '2026-09-11',
      },
    ],
    votaciones: [
      {
        id: 'vo1', tipo: 'votacion', titulo: 'Cambio de empresa de seguridad', estado: 'abierta',
        descripcion: 'Reemplazar la ronda nocturna actual por Vigilancia Andina, con un costo adicional de $6.500 por casa al mes.',
        opciones: [{ id: 'o1', texto: 'A favor', votos: 7 }, { id: 'o2', texto: 'En contra', votos: 2 }, { id: 'o3', texto: 'Abstención', votos: 1 }],
        inicio: '2026-10-20', cierre: '2026-10-31', quorum: 60, recordatorios: 1,
      },
      {
        id: 'vo2', tipo: 'encuesta', titulo: '¿Qué día prefieres para la próxima asamblea?', estado: 'abierta',
        descripcion: 'La usaremos para fijar la asamblea de noviembre.',
        opciones: [{ id: 'o1', texto: 'Martes 19:30', votos: 3 }, { id: 'o2', texto: 'Jueves 19:30', votos: 2 }, { id: 'o3', texto: 'Sábado 11:00', votos: 1 }],
        inicio: '2026-10-23', cierre: '2026-11-03', quorum: null, recordatorios: 0,
      },
      {
        id: 'vo0', tipo: 'votacion', titulo: 'Poda de árboles del pasaje', estado: 'cerrada',
        descripcion: 'Contratar la poda de los 12 árboles del pasaje por $260.000 con cargo al gasto común.',
        opciones: [{ id: 'o1', texto: 'A favor', votos: 11 }, { id: 'o2', texto: 'En contra', votos: 1 }],
        inicio: '2026-09-15', cierre: '2026-09-25', quorum: 60, recordatorios: 2,
      },
    ],
    contactos: [
      { id: 'k1', nombre: 'Administración Ibáñez y Cía.', detalle: 'Administración del condominio', telefono: '+56 2 2345 6789', horario: 'Lunes a viernes, 9:00 a 18:00', visible: true },
      { id: 'k2', nombre: 'Automatismos Sur SpA', detalle: 'Mantención del portón eléctrico', telefono: '+56 9 8765 4321', horario: 'Urgencias 24 horas', visible: true },
      { id: 'k3', nombre: 'Gasfitería Don Hugo', detalle: 'Gasfíter de confianza del condominio', telefono: '+56 9 5555 1212', horario: 'Lunes a sábado', visible: false },
    ],
  };
}

function villa() {
  return {
    actas: [
      {
        id: 'vac1', numero: 31, tipo: 'Asamblea ordinaria', fecha: '2026-10-04', lugar: 'Sede vecinal', estado: 'publicada', unidadesPresentes: 41,
        asistentes: ['Directiva completa', 'Representantes de 41 casas'],
        temas: ['Reparación del portón de acceso', 'Cuota social 2027'],
        acuerdos: [{ texto: 'Pedir tres cotizaciones para el portón de acceso.', responsable: 'Tesorería', plazo: '2026-10-20' }],
        redactadaPor: 'Secretaría', publicadaEn: '2026-10-06',
      },
    ],
    votaciones: [
      {
        id: 'vvo1', tipo: 'votacion', titulo: 'Instalar alarma comunitaria', estado: 'abierta',
        descripcion: 'Alarma con botón en cada casa, financiada con una cuota extraordinaria de $15.000 por casa.',
        opciones: [{ id: 'o1', texto: 'A favor', votos: 38 }, { id: 'o2', texto: 'En contra', votos: 9 }],
        inicio: '2026-10-18', cierre: '2026-11-08', quorum: 50, recordatorios: 0,
      },
    ],
    contactos: [
      { id: 'vk1', nombre: 'Plan Cuadrante 14', detalle: 'Carabineros del sector', telefono: '+56 9 8888 0014', horario: '24 horas', visible: true },
    ],
  };
}

export function directivaInicial() {
  return {
    1: lasPalmas(),
    2: villa(),
    3: { actas: [], votaciones: [], contactos: [] },
  };
}

// Números que siempre aparecen en el directorio de la app; no se editan.
export const EMERGENCIAS = [
  { nombre: 'Ambulancia (SAMU)', telefono: '131' },
  { nombre: 'Bomberos', telefono: '132' },
  { nombre: 'Carabineros', telefono: '133' },
  { nombre: 'PDI', telefono: '134' },
];

export const directivaVacia = () => ({ actas: [], votaciones: [], contactos: [] });
