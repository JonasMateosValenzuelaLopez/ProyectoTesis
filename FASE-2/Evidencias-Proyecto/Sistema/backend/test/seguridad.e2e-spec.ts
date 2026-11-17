import './utilidades/entorno';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { crearAppPruebas, ipNueva } from './utilidades/app';
import { ejecutarSql } from './utilidades/bd';
import {
  Escenario,
  PASSWORD,
  PERSONAS,
  prepararEscenario,
} from './utilidades/escenario';

describe('Seguridad: API con base de datos real', () => {
  let app: NestExpressApplication;
  let e: Escenario;
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });

  beforeAll(async () => {
    app = await crearAppPruebas();
    e = await prepararEscenario(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Autenticación', () => {
    it.each([['/auth/perfil'], ['/plataforma/comunidades'], ['/unidades']])(
      'debe responder 401 en %s sin token',
      async (ruta) => {
        const respuesta = await e.anonimo.get(ruta);

        expect(respuesta.status).toBe(401);
      },
    );

    it('debe rechazar un token con la firma alterada', async () => {
      const firmado = await jwt.signAsync({ sub: e.idResidenteA });
      const alterado = `${firmado.slice(0, -4)}abcd`;

      const respuesta = await e.anonimo.conToken(alterado).get('/auth/perfil');

      expect(respuesta.status).toBe(401);
    });

    it('debe rechazar un token firmado con otra clave', async () => {
      const ajeno = await new JwtService({
        secret: 'otra-clave-que-no-es-la-del-servidor-entrecasas',
      }).signAsync({ sub: e.idPlataforma });

      const respuesta = await e.anonimo
        .conToken(ajeno)
        .get('/plataforma/comunidades');

      expect(respuesta.status).toBe(401);
    });

    it('debe rechazar un token vencido', async () => {
      const vencido = await jwt.signAsync({
        sub: e.idResidenteA,
        exp: Math.floor(Date.now() / 1000) - 60,
      });

      const respuesta = await e.anonimo.conToken(vencido).get('/auth/perfil');

      expect(respuesta.status).toBe(401);
    });

    it('debe responder igual a una cuenta inexistente y a una contraseña incorrecta', async () => {
      const inexistente = await e.anonimo.post('/auth/login', {
        identificador: '9876543-3',
        password: PASSWORD,
      });
      const incorrecta = await e.anonimo.post('/auth/login', {
        identificador: PERSONAS.residenteA.identificador,
        password: 'OtraClave999',
      });

      expect(inexistente.status).toBe(401);
      expect(incorrecta.status).toBe(401);
      expect(inexistente.body.mensaje).toBe(incorrecta.body.mensaje);
      expect(inexistente.body.codigo).toBe(incorrecta.body.codigo);
    });

    it('debe bloquear con 429 el sexto intento de login en un minuto desde la misma IP', async () => {
      const ip = ipNueva();
      const estados: number[] = [];
      for (let intento = 0; intento < 6; intento += 1) {
        const respuesta = await e.anonimo.post(
          '/auth/login',
          {
            identificador: PERSONAS.residenteA.identificador,
            password: 'Mala1234',
          },
          ip,
        );
        estados.push(respuesta.status);
      }

      expect(estados).toEqual([401, 401, 401, 401, 401, 429]);
    });

    it('debe guardar las contraseñas con hash bcrypt y nunca en texto plano', async () => {
      const filas = (await ejecutarSql(
        'SELECT password_hash FROM usuarios WHERE password_hash IS NOT NULL',
      )) as { password_hash: string }[];

      expect(filas.length).toBeGreaterThan(0);
      for (const fila of filas) {
        expect(fila.password_hash).toMatch(/^\$2[aby]\$10\$/);
        expect(fila.password_hash).not.toContain(PASSWORD);
      }
    });

    it('no debe devolver el hash de la contraseña en el login ni en Personas', async () => {
      const login = await e.anonimo.post('/auth/login', {
        identificador: PERSONAS.residenteA.identificador,
        password: PASSWORD,
      });
      const personas = await e.plataforma.get('/plataforma/personas');

      expect(JSON.stringify(login.body)).not.toMatch(/password|\$2[aby]\$/i);
      expect(JSON.stringify(personas.body)).not.toMatch(/password|\$2[aby]\$/i);
    });
  });

  describe('Autorización por cargo y por comunidad', () => {
    it('debe responder 403 cuando un residente usa una ruta de la administración', async () => {
      const respuesta = await e.residenteA.get('/solicitudes-acceso');

      expect(respuesta.status).toBe(403);
    });

    it('debe responder 403 cuando alguien que no es del equipo usa una ruta de Plataforma', async () => {
      const respuesta = await e.presidenteA.get('/plataforma/personas');

      expect(respuesta.status).toBe(403);
    });

    it('debe responder 403 cuando se pide una comunidad a la que la persona no pertenece', async () => {
      const respuesta = await e.presidenteA
        .enComunidad(e.idRedB)
        .get('/unidades');

      expect(respuesta.status).toBe(403);
    });

    it('debe exigir el header X-Red-Id en las rutas de una comunidad', async () => {
      const sesion = await e.anonimo.iniciarSesion(
        PERSONAS.presidenteA.identificador,
        PASSWORD,
      );

      const respuesta = await e.anonimo
        .conToken(sesion.accessToken)
        .get('/unidades');

      expect(respuesta.status).toBe(400);
    });

    it('debe tratar como inexistente una unidad de otra comunidad', async () => {
      const unidadesA = await e.presidenteA.get('/unidades');
      const [unidadA] = unidadesA.body as { idUnidad: number }[];

      const respuesta = await e.presidenteB.patch(
        `/unidades/${unidadA.idUnidad}`,
        {
          calle: 'Intento de otra comunidad',
        },
      );

      expect([400, 404]).toContain(respuesta.status);
      const unidadesB = await e.presidenteB.get('/unidades');
      expect(
        (unidadesB.body as { idUnidad: number }[]).map((u) => u.idUnidad),
      ).not.toContain(unidadA.idUnidad);
    });

    it('debe impedir que el equipo EntreCasas bloquee su propia cuenta', async () => {
      const respuesta = await e.plataforma.post(
        `/plataforma/personas/${e.idPlataforma}/bloqueo`,
        { motivo: 'Prueba' },
      );

      expect(respuesta.status).toBe(409);
    });
  });

  describe('Validación de entradas', () => {
    it.each([
      ["' OR '1'='1"],
      ['1; DROP TABLE usuarios; --'],
      ["12345678-5' --"],
    ])(
      'debe rechazar con 400 el identificador malicioso %s sin llegar a la BD',
      async (identificador) => {
        const respuesta = await e.anonimo.post('/auth/login', {
          identificador,
          password: PASSWORD,
        });

        expect(respuesta.status).toBe(400);
        const tablas = (await ejecutarSql(
          "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'usuarios'",
        )) as { total: number }[];
        expect(Number(tablas[0].total)).toBe(1);
      },
    );

    it.each([["' OR 1=1 -- "], ['%%'], ['_%']])(
      'debe tratar la búsqueda %s como texto literal y no devolver a todas las personas',
      async (buscar) => {
        const respuesta = await e.plataforma.get(
          `/plataforma/personas?buscar=${encodeURIComponent(buscar)}`,
        );

        expect(respuesta.status).toBe(200);
        expect(respuesta.body).toEqual({ personas: [], siguiente: null });
      },
    );

    it('debe rechazar campos no permitidos como un cargo o una marca de Plataforma inyectados', async () => {
      const respuesta = await e.anonimo.post('/solicitudes-acceso', {
        idRed: e.idRedA,
        identificador: '9876543-3',
        nombre: 'Intruso',
        primerApellido: 'Prueba',
        correo: 'intruso@prueba.cl',
        numeroUnidad: '5',
        aceptaPrivacidad: true,
        idRol: 1,
        esPlataforma: true,
      });

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.campos).toEqual(
        expect.objectContaining({
          idRol: 'Este campo no está permitido',
          esPlataforma: 'Este campo no está permitido',
        }),
      );
    });

    it('debe responder 400 a un JSON mal formado', async () => {
      const respuesta = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', ipNueva())
        .set('Content-Type', 'application/json')
        .send('{"identificador": "12345678-5", ');

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.mensaje).toBe(
        'El cuerpo de la solicitud no es un JSON válido',
      );
    });

    it('debe rechazar con 400 un id de ruta que no es un número', async () => {
      const respuesta = await e.plataforma.post(
        '/plataforma/personas/1%20OR%201=1/bloqueo',
        { motivo: 'Prueba' },
      );

      expect(respuesta.status).toBe(400);
    });

    it('debe devolver los errores con el formato común, sin detalles internos', async () => {
      const respuesta = await e.plataforma.get(
        '/plataforma/comunidades/999999',
      );

      expect(respuesta.status).toBe(404);
      expect(Object.keys(respuesta.body).sort()).toEqual([
        'codigo',
        'idSolicitud',
        'mensaje',
        'statusCode',
      ]);
      expect(JSON.stringify(respuesta.body)).not.toMatch(/SELECT|stack|at \//i);
    });
  });
});
