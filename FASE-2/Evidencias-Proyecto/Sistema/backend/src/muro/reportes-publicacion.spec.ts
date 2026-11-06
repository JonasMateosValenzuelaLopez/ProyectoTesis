import { EntityManager, In, Repository } from 'typeorm';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { LugarPublicacion, MuroReporte } from './entities/muro-reporte.entity';
import {
  idsReportadasPor,
  reportesPendientesDe,
  viviendasPorUsuario,
} from './reportes-publicacion';

describe('reportes-publicacion', () => {
  let mockManager: { find: jest.Mock };
  let mockReportesRepository: { find: jest.Mock };

  beforeEach(() => {
    mockManager = { find: jest.fn().mockResolvedValue([]) };
    mockReportesRepository = { find: jest.fn().mockResolvedValue([]) };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('idsReportadasPor', () => {
    it('no debe consultar sin publicaciones', async () => {
      const resultado = await idsReportadasPor(
        mockReportesRepository as unknown as Repository<MuroReporte>,
        LugarPublicacion.MARKETPLACE,
        [],
        8,
      );

      expect(resultado).toEqual(new Set());
      expect(mockReportesRepository.find).not.toHaveBeenCalled();
    });

    it('debe devolver los ids que la persona ya reportó', async () => {
      mockReportesRepository.find.mockResolvedValue([{ idPublicacion: 4 }]);

      const resultado = await idsReportadasPor(
        mockReportesRepository as unknown as Repository<MuroReporte>,
        LugarPublicacion.MURO,
        [4, 5],
        8,
      );

      expect(resultado).toEqual(new Set([4]));
    });
  });

  describe('reportesPendientesDe', () => {
    it('no debe consultar sin publicaciones', async () => {
      const resultado = await reportesPendientesDe(
        mockManager as unknown as EntityManager,
        LugarPublicacion.MURO,
        [],
      );

      expect(resultado).toEqual([]);
      expect(mockManager.find).not.toHaveBeenCalled();
    });
  });

  describe('viviendasPorUsuario', () => {
    it('no debe consultar sin personas', async () => {
      const resultado = await viviendasPorUsuario(
        mockManager as unknown as EntityManager,
        3,
        [],
      );

      expect(resultado).toEqual(new Map());
      expect(mockManager.find).not.toHaveBeenCalled();
    });

    it('debe quedarse con la primera vivienda vigente de cada persona en la comunidad', async () => {
      mockManager.find.mockResolvedValue([
        { idUsuario: 9, unidad: { numeroIdentificador: '7' } },
        { idUsuario: 9, unidad: { numeroIdentificador: '8' } },
        { idUsuario: 10, unidad: null },
      ]);

      const resultado = await viviendasPorUsuario(
        mockManager as unknown as EntityManager,
        3,
        [9, 10],
      );

      expect(mockManager.find).toHaveBeenCalledWith(
        Residencia,
        expect.objectContaining({
          where: expect.objectContaining({
            idUsuario: In([9, 10]),
            unidad: { idRed: 3 },
          }),
        }),
      );
      expect(resultado).toEqual(new Map([[9, '7']]));
    });
  });
});
