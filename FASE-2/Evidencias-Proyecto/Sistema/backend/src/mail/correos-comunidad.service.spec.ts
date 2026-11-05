import { EntityManager } from 'typeorm';
import { MailService } from './mail.service';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { CorreosComunidadService } from './correos-comunidad.service';

describe('CorreosComunidadService', () => {
  let target: CorreosComunidadService;
  let mockMail: { enviar: jest.Mock };
  let manager: { find: jest.Mock };

  const residencia = (idUsuario: number, idUnidad: number, conUsuario = true) =>
    ({
      idUsuario,
      idUnidad,
      usuario: conUsuario
        ? { nombre: `P${idUsuario}`, correo: `p${idUsuario}@correo.cl` }
        : null,
    }) as Residencia;

  beforeEach(() => {
    mockMail = { enviar: jest.fn().mockResolvedValue(true) };
    target = new CorreosComunidadService(mockMail as unknown as MailService);
    manager = {
      find: jest.fn((entidad: unknown) =>
        Promise.resolve(
          entidad === Residencia
            ? [
                residencia(1, 10),
                residencia(1, 20),
                residencia(2, 10),
                residencia(3, 30),
                residencia(4, 30, false),
              ]
            : [{ idUsuario: 1 }, { idUsuario: 3 }, { idUsuario: 4 }],
        ),
      ),
    };
  });

  it('debe juntar las unidades de cada persona y excluir a quien no tiene acceso a la comunidad', async () => {
    const resultado = await target.destinatarios(
      manager as unknown as EntityManager,
      3,
      [10, 20, 30],
    );

    expect(resultado).toEqual([
      {
        idUsuario: 1,
        nombre: 'P1',
        correo: 'p1@correo.cl',
        idsUnidad: [10, 20],
      },
      { idUsuario: 3, nombre: 'P3', correo: 'p3@correo.cl', idsUnidad: [30] },
    ]);
  });

  it('no debe consultar cuando no hay unidades', async () => {
    const resultado = await target.destinatarios(
      manager as unknown as EntityManager,
      3,
      [],
    );

    expect(resultado).toEqual([]);
    expect(manager.find).not.toHaveBeenCalled();
  });

  it('debe enviar los correos uno a uno sin bloquear la respuesta', async () => {
    target.enviarEnSegundoPlano([
      { para: 'a@correo.cl', asunto: 'A', texto: 'x' },
      { para: 'b@correo.cl', asunto: 'B', texto: 'y' },
    ]);
    await new Promise((resolver) => setImmediate(resolver));

    expect(mockMail.enviar).toHaveBeenCalledTimes(2);
  });
});
