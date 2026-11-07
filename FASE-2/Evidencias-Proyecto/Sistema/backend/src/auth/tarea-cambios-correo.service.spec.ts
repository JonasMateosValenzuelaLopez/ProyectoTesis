import { Logger } from '@nestjs/common';
import { MisDatosService } from './mis-datos.service';
import {
  ESPERA_INICIAL_MS,
  INTERVALO_MS,
  TareaCambiosCorreo,
} from './tarea-cambios-correo.service';

describe('TareaCambiosCorreo', () => {
  let target: TareaCambiosCorreo;
  let mockMisDatos: { anularVencidos: jest.Mock };
  let log: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    mockMisDatos = { anularVencidos: jest.fn().mockResolvedValue(0) };
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    target = new TareaCambiosCorreo(mockMisDatos as unknown as MisDatosService);
  });

  afterEach(() => {
    target.onApplicationShutdown();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('debe ejecutarse un minuto después de arrancar y luego cada hora', async () => {
    target.onApplicationBootstrap();

    await jest.advanceTimersByTimeAsync(ESPERA_INICIAL_MS);
    expect(mockMisDatos.anularVencidos).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(INTERVALO_MS);
    expect(mockMisDatos.anularVencidos).toHaveBeenCalledTimes(2);
  });

  it('no debe ejecutarse después de apagar la aplicación', async () => {
    target.onApplicationBootstrap();
    target.onApplicationShutdown();

    await jest.advanceTimersByTimeAsync(INTERVALO_MS);

    expect(mockMisDatos.anularVencidos).not.toHaveBeenCalled();
  });

  it('debe dejar constancia en el log de cuántos pedidos anuló', async () => {
    mockMisDatos.anularVencidos.mockResolvedValue(3);

    await target.ejecutar();

    expect(log).toHaveBeenCalledWith(
      'Pedidos de cambio de correo vencidos anulados: 3',
    );
  });

  it('no debe escribir en el log si no había nada vencido', async () => {
    await target.ejecutar();

    expect(log).not.toHaveBeenCalled();
  });

  it('debe registrar el error sin botar la aplicación, para reintentar después', async () => {
    mockMisDatos.anularVencidos.mockRejectedValue(new Error('sin conexión'));

    await expect(target.ejecutar()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      'No se pudieron anular los pedidos de cambio de correo vencidos; se reintentará en la próxima ejecución',
      expect.stringContaining('sin conexión'),
    );
  });

  it('no debe superponer dos ejecuciones', async () => {
    let terminar: () => void = () => undefined;
    mockMisDatos.anularVencidos.mockReturnValue(
      new Promise((resolver) => {
        terminar = () => resolver(0);
      }),
    );

    const primera = target.ejecutar();
    await target.ejecutar();
    terminar();
    await primera;

    expect(mockMisDatos.anularVencidos).toHaveBeenCalledTimes(1);
  });
});
