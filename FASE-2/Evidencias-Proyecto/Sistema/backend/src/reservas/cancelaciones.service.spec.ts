import { In } from 'typeorm';
import { CorreosComunidadService } from '../mail/correos-comunidad.service';
import { CancelacionesService } from './cancelaciones.service';
import { EstadoReserva, Reserva } from './entities/reserva.entity';

describe('CancelacionesService', () => {
  let target: CancelacionesService;
  let mockCorreosService: {
    destinatarios: jest.Mock;
    enviarEnSegundoPlano: jest.Mock;
  };
  let mockManager: { update: jest.Mock };

  const crearReserva = (cambios: Partial<Reserva> = {}) =>
    ({
      idReserva: 7,
      idEspacio: 2,
      idUnidad: 40,
      fechaReserva: '2026-11-08',
      horaInicio: '12:00',
      horaFin: '17:00',
      ...cambios,
    }) as Reserva;

  beforeEach(() => {
    mockCorreosService = {
      destinatarios: jest.fn().mockResolvedValue([
        { idUsuario: 1, nombre: 'Rosa', correo: 'rosa@x.cl', idsUnidad: [40] },
        { idUsuario: 2, nombre: 'Beto', correo: 'beto@x.cl', idsUnidad: [41] },
      ]),
      enviarEnSegundoPlano: jest.fn(),
    };
    mockManager = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    target = new CancelacionesService(
      mockCorreosService as unknown as CorreosComunidadService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cancelar', () => {
    it('debe cancelar con el motivo y preparar un correo para los residentes de cada unidad', async () => {
      const resultado = await target.cancelar(
        mockManager as never,
        3,
        [crearReserva(), crearReserva({ idReserva: 8, idUnidad: null })],
        () => 'Quincho',
        'Mantención',
      );

      expect(mockManager.update).toHaveBeenCalledWith(
        Reserva,
        { idReserva: In([7, 8]) },
        {
          estadoReserva: EstadoReserva.CANCELADA,
          motivoCancelacion: 'Mantención',
        },
      );
      expect(mockCorreosService.destinatarios).toHaveBeenCalledWith(
        mockManager,
        3,
        [40],
      );
      expect(resultado).toEqual({
        correos: [
          {
            para: 'rosa@x.cl',
            asunto: 'Reserva cancelada: Quincho',
            texto:
              'Hola Rosa:\n\nSe canceló la reserva de Quincho del 08-11-2026, de 12:00 a 17:00.\n\n' +
              'Motivo: Mantención\n\nPuedes ver tus reservas en la app EntreCasas.',
          },
        ],
        sinAviso: 1,
      });
    });

    it('no debe tocar la base cuando no hay reservas', async () => {
      const resultado = await target.cancelar(
        mockManager as never,
        3,
        [],
        () => 'Quincho',
        'Mantención',
      );

      expect(resultado).toEqual({ correos: [], sinAviso: 0 });
      expect(mockManager.update).not.toHaveBeenCalled();
    });
  });

  describe('enviar', () => {
    it('debe enviar en segundo plano solo cuando hay correos', () => {
      target.enviar([]);
      target.enviar([{ para: 'a@x.cl', asunto: 'A', texto: 'B' }]);

      expect(mockCorreosService.enviarEnSegundoPlano).toHaveBeenCalledTimes(1);
    });
  });
});
