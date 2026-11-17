import './utilidades/entorno';
import { NestExpressApplication } from '@nestjs/platform-express';
import { performance } from 'node:perf_hooks';
import { ClienteApi, crearAppPruebas } from './utilidades/app';
import { ejecutarSql } from './utilidades/bd';
import {
  Escenario,
  PASSWORD,
  PERSONAS,
  prepararEscenario,
} from './utilidades/escenario';

const USUARIOS_CONCURRENTES = 50;
const PETICIONES_POR_USUARIO = 10;
const LIMITE_P95_MS = 2000;

interface Medicion {
  ruta: string;
  estado: number;
  ms: number;
}

const percentil = (valores: number[], p: number) => {
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(
    ordenados.length - 1,
    Math.ceil((p / 100) * ordenados.length) - 1,
  );
  return ordenados[indice];
};

const resumir = (mediciones: Medicion[], segundos: number) => {
  const tiempos = mediciones.map((m) => m.ms);
  return {
    peticiones: mediciones.length,
    errores: mediciones.filter((m) => m.estado >= 400).length,
    promedioMs: Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length),
    p50Ms: Math.round(percentil(tiempos, 50)),
    p95Ms: Math.round(percentil(tiempos, 95)),
    maximoMs: Math.round(Math.max(...tiempos)),
    peticionesPorSegundo: Math.round(mediciones.length / segundos),
  };
};

async function medir(
  ruta: string,
  peticion: () => PromiseLike<{ status: number }>,
): Promise<Medicion> {
  const inicio = performance.now();
  const respuesta = await peticion();
  return { ruta, estado: respuesta.status, ms: performance.now() - inicio };
}

describe('Rendimiento: RNF-01 con 50 usuarios concurrentes', () => {
  let app: NestExpressApplication;
  let e: Escenario;

  beforeAll(async () => {
    app = await crearAppPruebas();
    e = await prepararEscenario(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('debe responder el 95 % de las consultas de lectura en menos de 2 segundos', async () => {
    const rutasResidente = ['/auth/perfil', '/muro', '/reservas/espacios'];
    const rutasAdministracion = [
      '/unidades',
      '/solicitudes-acceso',
      '/comunidad/modulos',
    ];
    const usuario = async (indice: number) => {
      const cliente: ClienteApi =
        indice % 2 === 0 ? e.residenteA : e.presidenteA;
      const rutas = indice % 2 === 0 ? rutasResidente : rutasAdministracion;
      const mediciones: Medicion[] = [];
      for (let i = 0; i < PETICIONES_POR_USUARIO; i += 1) {
        const ruta = rutas[i % rutas.length];
        mediciones.push(await medir(ruta, () => cliente.get(ruta)));
      }
      return mediciones;
    };

    const inicio = performance.now();
    const mediciones = (
      await Promise.all(
        Array.from({ length: USUARIOS_CONCURRENTES }, (_, i) => usuario(i)),
      )
    ).flat();
    const resumen = resumir(mediciones, (performance.now() - inicio) / 1000);
    console.log('Lecturas con 50 usuarios concurrentes', resumen);

    expect(resumen.peticiones).toBe(
      USUARIOS_CONCURRENTES * PETICIONES_POR_USUARIO,
    );
    expect(resumen.errores).toBe(0);
    expect(resumen.p95Ms).toBeLessThan(LIMITE_P95_MS);
  });

  const iniciarYNavegar = async (esperaMs: number) => {
    await new Promise((resolver) => setTimeout(resolver, esperaMs));
    const mediciones: Medicion[] = [];
    let token = '';
    mediciones.push(
      await medir('/auth/login', async () => {
        const respuesta = await e.anonimo.post('/auth/login', {
          identificador: PERSONAS.residenteA.identificador,
          password: PASSWORD,
        });
        token = (respuesta.body as { accessToken?: string }).accessToken ?? '';
        return respuesta;
      }),
    );
    const cliente = e.anonimo.conToken(token, e.idRedA);
    for (const ruta of ['/auth/perfil', '/muro', '/reservas/espacios']) {
      mediciones.push(await medir(ruta, () => cliente.get(ruta)));
    }
    return mediciones;
  };

  it('debe mantener el p95 bajo 2 segundos con 50 usuarios que inician sesión durante 10 segundos y navegan', async () => {
    const inicio = performance.now();
    const mediciones = (
      await Promise.all(
        Array.from({ length: USUARIOS_CONCURRENTES }, (_, i) =>
          iniciarYNavegar((i * 10_000) / USUARIOS_CONCURRENTES),
        ),
      )
    ).flat();
    const resumen = resumir(mediciones, (performance.now() - inicio) / 1000);
    console.log('Sesiones repartidas en 10 segundos', resumen);

    expect(resumen.errores).toBe(0);
    expect(resumen.p95Ms).toBeLessThan(LIMITE_P95_MS);
  });

  it('debe atender sin errores 50 inicios de sesión en el mismo instante (prueba de estrés)', async () => {
    const inicio = performance.now();
    const mediciones = (
      await Promise.all(
        Array.from({ length: USUARIOS_CONCURRENTES }, () => iniciarYNavegar(0)),
      )
    ).flat();
    const resumen = resumir(mediciones, (performance.now() - inicio) / 1000);
    const logins = resumir(
      mediciones.filter((m) => m.ruta === '/auth/login'),
      (performance.now() - inicio) / 1000,
    );
    console.log('Estrés: 50 inicios de sesión simultáneos', {
      todas: resumen,
      soloLogin: logins,
    });

    expect(resumen.errores).toBe(0);
    expect(logins.peticiones).toBe(USUARIOS_CONCURRENTES);
  });

  it('debe crear publicaciones en el muro de forma concurrente sin errores ni pérdidas', async () => {
    const contar = async () =>
      Number(
        (
          (await ejecutarSql(
            'SELECT COUNT(*) AS total FROM muro_publicaciones',
          )) as { total: number }[]
        )[0].total,
      );
    const totalAntes = await contar();

    const inicio = performance.now();
    const mediciones = await Promise.all(
      Array.from({ length: USUARIOS_CONCURRENTES }, (_, i) =>
        medir('/muro', () =>
          e.residenteA.post('/muro', {
            contenido: `Publicación de carga número ${i + 1}`,
          }),
        ),
      ),
    );
    const resumen = resumir(mediciones, (performance.now() - inicio) / 1000);
    console.log('Escrituras concurrentes en el muro', resumen);

    expect(resumen.errores).toBe(0);
    expect(resumen.p95Ms).toBeLessThan(LIMITE_P95_MS);
    expect(await contar()).toBe(totalAntes + USUARIOS_CONCURRENTES);
  });
});
