import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configurarApp } from '../../src/config/configurar-app';
import { recrearBdPruebas } from './bd';

let ultimaIp = 0;

export const ipNueva = () => {
  ultimaIp += 1;
  return `10.${(ultimaIp >> 16) & 255}.${(ultimaIp >> 8) & 255}.${ultimaIp & 255}`;
};

export async function crearAppPruebas() {
  await recrearBdPruebas();
  const modulo = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = modulo.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configurarApp(app);
  await app.listen(0, '127.0.0.1');
  return app;
}

export class ClienteApi {
  constructor(
    private readonly app: NestExpressApplication,
    private readonly token?: string,
    private readonly idRed?: number,
  ) {}

  conToken(token: string, idRed?: number) {
    return new ClienteApi(this.app, token, idRed);
  }

  enComunidad(idRed: number) {
    return new ClienteApi(this.app, this.token, idRed);
  }

  get(ruta: string, ip = ipNueva()) {
    return this.preparar(request(this.app.getHttpServer()).get(ruta), ip);
  }

  post(ruta: string, cuerpo?: object, ip = ipNueva()) {
    return this.preparar(request(this.app.getHttpServer()).post(ruta), ip).send(
      cuerpo ?? {},
    );
  }

  put(ruta: string, cuerpo?: object, ip = ipNueva()) {
    return this.preparar(request(this.app.getHttpServer()).put(ruta), ip).send(
      cuerpo ?? {},
    );
  }

  patch(ruta: string, cuerpo?: object, ip = ipNueva()) {
    return this.preparar(
      request(this.app.getHttpServer()).patch(ruta),
      ip,
    ).send(cuerpo ?? {});
  }

  delete(ruta: string, ip = ipNueva()) {
    return this.preparar(request(this.app.getHttpServer()).delete(ruta), ip);
  }

  async iniciarSesion(identificador: string, password: string) {
    const respuesta = await this.post('/auth/login', {
      identificador,
      password,
    });
    if (respuesta.status !== 200) {
      throw new Error(
        `No se pudo iniciar sesión con ${identificador}: ${respuesta.status} ${JSON.stringify(respuesta.body)}`,
      );
    }
    return respuesta.body as {
      accessToken: string;
      usuario: { idUsuario: number; comunidades: { idRed: number }[] };
    };
  }

  private preparar(prueba: request.Test, ip: string) {
    prueba.set('X-Forwarded-For', ip);
    if (this.token) {
      prueba.set('Authorization', `Bearer ${this.token}`);
    }
    if (this.idRed) {
      prueba.set('X-Red-Id', String(this.idRed));
    }
    return prueba;
  }
}
