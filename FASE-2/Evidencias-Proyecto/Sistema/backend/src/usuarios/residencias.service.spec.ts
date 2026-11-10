import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, IsNull } from 'typeorm';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { condicionVigente } from '../common/utils/vigencia';
import { Residencia } from './entities/residencia.entity';
import { ResidenciasService } from './residencias.service';

const AHORA = new Date('2026-11-04T15:00:00Z');

describe('ResidenciasService', () => {
  let target: ResidenciasService;
  let mockResidenciasRepository: { update: jest.Mock; exists: jest.Mock };

  const red: ContextoRed = {
    idRed: 3,
    roles: [],
    modulos: [],
    idsUnidades: [12, 15],
  };

  const propia = {
    idResidencia: 82,
    idUsuario: 7,
    idUnidad: In([12, 15]),
    fechaEliminacion: IsNull(),
    ...condicionVigente('2026-11-04'),
  };

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    mockResidenciasRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      exists: jest.fn().mockResolvedValue(false),
    };

    const module = await Test.createTestingModule({
      providers: [
        ResidenciasService,
        {
          provide: getRepositoryToken(Residencia),
          useValue: mockResidenciasRepository,
        },
      ],
    }).compile();

    target = module.get(ResidenciasService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('marcarGuiaVista', () => {
    it('debe marcar la guía solo en una residencia propia, vigente, de la comunidad y aún sin marcar', async () => {
      await target.marcarGuiaVista(82, 7, red);

      expect(mockResidenciasRepository.update).toHaveBeenCalledWith(
        { ...propia, fechaGuiaVista: IsNull() },
        { fechaGuiaVista: AHORA },
      );
      expect(mockResidenciasRepository.exists).not.toHaveBeenCalled();
    });

    it('debe terminar sin cambiar la fecha cuando la guía ya estaba marcada', async () => {
      mockResidenciasRepository.update.mockResolvedValue({ affected: 0 });
      mockResidenciasRepository.exists.mockResolvedValue(true);

      await expect(target.marcarGuiaVista(82, 7, red)).resolves.toBeUndefined();

      expect(mockResidenciasRepository.exists).toHaveBeenCalledWith({
        where: propia,
      });
    });

    it('debe lanzar NotFoundException cuando la residencia es ajena, está vencida o es de otra comunidad', async () => {
      mockResidenciasRepository.update.mockResolvedValue({ affected: 0 });
      mockResidenciasRepository.exists.mockResolvedValue(false);

      await expect(target.marcarGuiaVista(82, 7, red)).rejects.toThrow(
        new NotFoundException('Residencia no encontrada'),
      );
    });

    it('debe lanzar NotFoundException sin consultar la BD cuando no vive en esta comunidad', async () => {
      await expect(
        target.marcarGuiaVista(82, 7, { ...red, idsUnidades: [] }),
      ).rejects.toThrow(new NotFoundException('Residencia no encontrada'));

      expect(mockResidenciasRepository.update).not.toHaveBeenCalled();
    });
  });
});
