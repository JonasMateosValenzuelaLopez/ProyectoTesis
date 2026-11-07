import { Logger } from '@nestjs/common';
import { RetencionAccesosService } from './retencion-accesos.service';
import {
  ESPERA_INICIAL_MS,
  INTERVALO_MS,
  TareaRetencionAccesos,
} from './tarea-retencion-accesos.service';

const LIMITE = new Date('2025-11-06T03:00:00Z');

describe('TareaRetencionAccesos', () => {
  let target: TareaRetencionAccesos;
  let mockRetencion: { anonimizarVencidos: jest.Mock };
  let log: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    mockRetencion = {
      anonimizarVencidos: jest.fn().mockResolvedValue({
        limite: LIMITE,
        accesos: 0,
        invitaciones: 0,
        visitantes: 0,
      }),
    };
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    target = new TareaRetencionAccesos(
      mockRetencion as unknown as RetencionAccesosService,
    );
  });

  afterEach(() => {
    target.onApplicationShutdown();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('debe ejecutarse un minuto después de arrancar y luego una vez al día', async () => {
    target.onApplicationBootstrap();

    await jest.advanceTimersByTimeAsync(ESPERA_INICIAL_MS);
    expect(mockRetencion.anonimizarVencidos).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(INTERVALO_MS);
    expect(mockRetencion.anonimizarVencidos).toHaveBeenCalledTimes(2);
  });

  it('no debe ejecutarse después de apagar la aplicación', async () => {
    target.onApplicationBootstrap();
    target.onApplicationShutdown();

    await jest.advanceTimersByTimeAsync(INTERVALO_MS);

    expect(mockRetencion.anonimizarVencidos).not.toHaveBeenCalled();
  });

  it('debe dejar constancia en el log de cuánto anonimizó', async () => {
    mockRetencion.anonimizarVencidos.mockResolvedValue({
      limite: LIMITE,
      accesos: 4,
      invitaciones: 2,
      visitantes: 1,
    });

    await target.ejecutar();

    expect(log).toHaveBeenCalledWith(
      'Datos de visitas anteriores a 2025-11-06T03:00:00.000Z anonimizados: 4 accesos, 2 invitaciones, 1 visitantes',
    );
  });

  it('no debe escribir en el log si no había nada vencido', async () => {
    await target.ejecutar();

    expect(log).not.toHaveBeenCalled();
  });

  it('debe registrar el error sin botar la aplicación, para reintentar al día siguiente', async () => {
    mockRetencion.anonimizarVencidos.mockRejectedValue(
      new Error('sin conexión'),
    );

    await expect(target.ejecutar()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      'No se pudieron anonimizar los datos de visitas vencidos; se reintentará en la próxima ejecución',
      expect.stringContaining('sin conexión'),
    );
  });

  it('no debe superponer dos ejecuciones', async () => {
    let terminar: () => void = () => undefined;
    mockRetencion.anonimizarVencidos.mockReturnValue(
      new Promise((resolver) => {
        terminar = () =>
          resolver({
            limite: LIMITE,
            accesos: 0,
            invitaciones: 0,
            visitantes: 0,
          });
      }),
    );

    const primera = target.ejecutar();
    await target.ejecutar();
    terminar();
    await primera;

    expect(mockRetencion.anonimizarVencidos).toHaveBeenCalledTimes(1);
  });
});
