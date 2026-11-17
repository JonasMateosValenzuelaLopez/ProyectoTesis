import './utilidades/entorno';
import { NestExpressApplication } from '@nestjs/platform-express';
import { crearAppPruebas } from './utilidades/app';
import {
  Escenario,
  PASSWORD,
  PERSONAS,
  prepararEscenario,
} from './utilidades/escenario';

describe('Integración: API con base de datos real', () => {
  let app: NestExpressApplication;
  let e: Escenario;

  beforeAll(async () => {
    app = await crearAppPruebas();
    e = await prepararEscenario(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Plataforma y alta de comunidades', () => {
    it('debe listar las dos comunidades creadas con su responsable', async () => {
      const respuesta = await e.plataforma.get('/plataforma/comunidades');

      expect(respuesta.status).toBe(200);
      expect(
        (respuesta.body as { nombre: string; responsable: { cargo: string } }[])
          .map((c) => ({ nombre: c.nombre, cargo: c.responsable.cargo }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      ).toEqual([
        { nombre: 'Villa Las Pruebas', cargo: 'Presidente' },
        { nombre: 'Villa Vecina', cargo: 'Presidente' },
      ]);
    });

    it('debe generar las unidades desde la estructura de la villa', async () => {
      const respuesta = await e.presidenteA.get('/unidades');

      expect(respuesta.status).toBe(200);
      expect(
        (respuesta.body as { numeroIdentificador: string }[])
          .map((u) => u.numeroIdentificador)
          .sort(),
      ).toEqual(['1', '2', '3', '4', '5']);
    });
  });

  describe('Solicitud de acceso y aprobación', () => {
    it('debe dejar al residente aprobado con su vivienda y su cargo al iniciar sesión', async () => {
      const sesion = await e.anonimo.iniciarSesion(
        PERSONAS.residenteA.identificador,
        PASSWORD,
      );

      expect(sesion.usuario.comunidades).toEqual([
        expect.objectContaining({
          idRed: e.idRedA,
          roles: [{ idRol: 6, nombre: 'Residente' }],
          unidades: [
            expect.objectContaining({
              numeroIdentificador: '3',
              tipoResidencia: 'Propietario',
            }),
          ],
        }),
      ]);
    });

    it('debe guardar la aceptación del aviso de privacidad y su versión', async () => {
      const respuesta = await e.presidenteA.get(
        '/solicitudes-acceso?estado=Aprobada',
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual([
        expect.objectContaining({
          identificador: PERSONAS.residenteA.identificador,
          versionPrivacidad: '2026-11-10',
          privacidadAceptadaEn: expect.any(String),
          correoAjeno: false,
        }),
      ]);
    });

    it('debe rechazar una solicitud sin aceptar el aviso de privacidad', async () => {
      const respuesta = await e.anonimo.post('/solicitudes-acceso', {
        idRed: e.idRedA,
        identificador: '9876543-3',
        nombre: 'Diego',
        primerApellido: 'Sinconsentimiento',
        correo: 'diego@prueba.cl',
        numeroUnidad: '4',
      });

      expect(respuesta.status).toBe(400);
      expect(respuesta.body).toMatchObject({
        campos: {
          aceptaPrivacidad:
            'Debes aceptar el aviso de privacidad para enviar la solicitud',
        },
      });
    });
  });

  describe('Módulos de la comunidad', () => {
    afterEach(async () => {
      await e.presidenteA.put('/comunidad/modulos/muro', { activo: true });
    });

    it('debe ocultar el muro al residente cuando la administración apaga el módulo', async () => {
      const antes = await e.residenteA.get('/muro');
      const apagado = await e.presidenteA.put('/comunidad/modulos/muro', {
        activo: false,
      });
      const despues = await e.residenteA.get('/muro');

      expect(antes.status).toBe(200);
      expect(apagado.status).toBe(200);
      expect(
        (apagado.body as { codigo: string; activo: boolean }[]).find(
          (m) => m.codigo === 'muro',
        ),
      ).toMatchObject({ activo: false });
      expect(despues.status).toBe(403);
    });

    it('debe impedir a la administración cambiar el módulo de administrador externo', async () => {
      const respuesta = await e.presidenteA.put(
        '/comunidad/modulos/administrador_externo',
        { activo: true },
      );

      expect(respuesta.status).toBe(403);
      expect(respuesta.body).toMatchObject({
        mensaje: 'Este módulo solo lo cambia el equipo EntreCasas',
      });
    });
  });

  describe('Reservas', () => {
    it('debe rechazar con 409 una segunda reserva del mismo bloque', async () => {
      const creados = await e.residenteA.get('/reservas/espacios');
      const [creado] = creados.body as { idEspacio: number; nombre: string }[];
      const configurado = await e.presidenteA.put('/reservas/espacios', {
        espacios: [
          {
            idEspacio: creado.idEspacio,
            nombre: creado.nombre,
            bloques: [{ horaInicio: '12:00', horaFin: '16:00' }],
          },
        ],
      });
      const espacios = await e.residenteA.get('/reservas/espacios');
      const [quincho] = espacios.body as {
        idEspacio: number;
        bloques: { horaInicio: string }[];
      }[];
      const pasadoManana = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const reserva = {
        idEspacio: quincho.idEspacio,
        idUnidad: e.idUnidadResidenteA,
        fecha: pasadoManana,
        horaInicio: quincho.bloques[0].horaInicio,
      };

      const primera = await e.residenteA.post('/reservas', reserva);
      const segunda = await e.residenteA.post('/reservas', reserva);

      expect(configurado.status).toBe(200);
      expect(quincho.bloques).toEqual([
        expect.objectContaining({ horaInicio: '12:00' }),
      ]);
      expect(primera.status).toBe(201);
      expect(segunda.status).toBe(409);
    });
  });

  describe('Personas de Plataforma', () => {
    afterEach(async () => {
      await e.plataforma.delete(
        `/plataforma/personas/${e.idResidenteA}/bloqueo`,
      );
    });

    it('debe impedir el inicio de sesión de una cuenta bloqueada y permitirlo al desbloquearla', async () => {
      const bloqueo = await e.plataforma.post(
        `/plataforma/personas/${e.idResidenteA}/bloqueo`,
        { motivo: 'Prueba de integración' },
      );
      const conBloqueo = await e.anonimo.post('/auth/login', {
        identificador: PERSONAS.residenteA.identificador,
        password: PASSWORD,
      });
      const tokenAnterior = await e.residenteA.get('/auth/perfil');
      await e.plataforma.delete(
        `/plataforma/personas/${e.idResidenteA}/bloqueo`,
      );
      const sinBloqueo = await e.anonimo.post('/auth/login', {
        identificador: PERSONAS.residenteA.identificador,
        password: PASSWORD,
      });

      expect(bloqueo.status).toBe(200);
      expect(conBloqueo.status).toBe(403);
      expect(conBloqueo.body).toMatchObject({ codigo: 'CUENTA_BLOQUEADA' });
      expect(tokenAnterior.status).toBe(403);
      expect(sinBloqueo.status).toBe(200);
    });

    it('debe encontrar a una persona por su RUT escrito con puntos', async () => {
      const respuesta = await e.plataforma.get(
        '/plataforma/personas?buscar=22.222.222-2',
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toMatchObject({
        personas: [
          {
            identificador: PERSONAS.residenteA.identificador,
            accesoActivado: true,
            comunidades: [{ idRed: e.idRedA, cargos: ['Residente'] }],
          },
        ],
        siguiente: null,
      });
    });
  });
});
