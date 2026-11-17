import { NestExpressApplication } from '@nestjs/platform-express';
import { ClienteApi } from './app';
import { crearCuentaPlataforma, definirPassword } from './bd';

export const PASSWORD = 'Clave1234';

export const PERSONAS = {
  plataforma: { identificador: '11111111-1', correo: 'equipo@prueba.cl' },
  presidenteA: { identificador: '12345678-5', correo: 'ana@prueba.cl' },
  presidenteB: { identificador: '7654321-6', correo: 'beto@prueba.cl' },
  residenteA: { identificador: '22222222-2', correo: 'carla@prueba.cl' },
} as const;

export interface Escenario {
  anonimo: ClienteApi;
  plataforma: ClienteApi;
  presidenteA: ClienteApi;
  presidenteB: ClienteApi;
  residenteA: ClienteApi;
  idRedA: number;
  idRedB: number;
  idPlataforma: number;
  idResidenteA: number;
  idUnidadResidenteA: number;
}

const comunidad = (
  nombre: string,
  responsable: { identificador: string; correo: string },
  nombreResponsable: string,
) => ({
  nombre,
  direccion: 'Calle de Prueba 123',
  tipo: 'Villa',
  estructura: { manzanas: 1, casasPorManzana: 5 },
  modulos: ['muro', 'marketplace', 'votaciones', 'reservas', 'cobros'],
  espacios: ['Quincho'],
  responsable: {
    identificador: responsable.identificador,
    nombre: nombreResponsable,
    primerApellido: 'Prueba',
    correo: responsable.correo,
  },
});

async function crearComunidad(
  plataforma: ClienteApi,
  datos: ReturnType<typeof comunidad>,
) {
  const respuesta = await plataforma.post('/plataforma/comunidades', datos);
  if (respuesta.status !== 201) {
    throw new Error(
      `No se pudo crear la comunidad: ${respuesta.status} ${JSON.stringify(respuesta.body)}`,
    );
  }
  return (respuesta.body as { idRed: number }).idRed;
}

export async function prepararEscenario(
  app: NestExpressApplication,
): Promise<Escenario> {
  const anonimo = new ClienteApi(app);

  await crearCuentaPlataforma(
    PERSONAS.plataforma.identificador,
    PERSONAS.plataforma.correo,
    PASSWORD,
  );
  const sesionPlataforma = await anonimo.iniciarSesion(
    PERSONAS.plataforma.identificador,
    PASSWORD,
  );
  const plataforma = anonimo.conToken(sesionPlataforma.accessToken);

  const idRedA = await crearComunidad(
    plataforma,
    comunidad('Villa Las Pruebas', PERSONAS.presidenteA, 'Ana'),
  );
  const idRedB = await crearComunidad(
    plataforma,
    comunidad('Villa Vecina', PERSONAS.presidenteB, 'Beto'),
  );
  await definirPassword(PERSONAS.presidenteA.identificador, PASSWORD);
  await definirPassword(PERSONAS.presidenteB.identificador, PASSWORD);

  const presidenteA = anonimo.conToken(
    (await anonimo.iniciarSesion(PERSONAS.presidenteA.identificador, PASSWORD))
      .accessToken,
    idRedA,
  );
  const presidenteB = anonimo.conToken(
    (await anonimo.iniciarSesion(PERSONAS.presidenteB.identificador, PASSWORD))
      .accessToken,
    idRedB,
  );

  await anonimo.post('/solicitudes-acceso', {
    idRed: idRedA,
    identificador: PERSONAS.residenteA.identificador,
    nombre: 'Carla',
    primerApellido: 'Residente',
    correo: PERSONAS.residenteA.correo,
    numeroUnidad: '3',
    aceptaPrivacidad: true,
  });
  const solicitudes = await presidenteA.get('/solicitudes-acceso');
  const [solicitud] = solicitudes.body as { idSolicitud: number }[];
  const aprobada = await presidenteA.patch(
    `/solicitudes-acceso/${solicitud.idSolicitud}/aprobar`,
    {},
  );
  if (aprobada.status !== 200) {
    throw new Error(
      `No se pudo aprobar la solicitud: ${aprobada.status} ${JSON.stringify(aprobada.body)}`,
    );
  }
  await definirPassword(PERSONAS.residenteA.identificador, PASSWORD);
  const sesionResidente = await anonimo.iniciarSesion(
    PERSONAS.residenteA.identificador,
    PASSWORD,
  );

  return {
    anonimo,
    plataforma,
    presidenteA,
    presidenteB,
    residenteA: anonimo.conToken(sesionResidente.accessToken, idRedA),
    idRedA,
    idRedB,
    idPlataforma: sesionPlataforma.usuario.idUsuario,
    idResidenteA: sesionResidente.usuario.idUsuario,
    idUnidadResidenteA: (
      sesionResidente.usuario.comunidades[0] as unknown as {
        unidades: { idUnidad: number }[];
      }
    ).unidades[0].idUnidad,
  };
}
