import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { RegistrarEgresoDto } from './dto/egresos-exenciones.dto';
import { EgresosService } from './egresos.service';
import { CategoriaGasto } from './entities/categoria-gasto.entity';
import { Egreso, EstadoVisado } from './entities/egreso.entity';

const AHORA = new Date('2026-11-05T15:00:00Z');

describe('EgresosService', () => {
  let target: EgresosService;
  let mockRepositorio: { find: jest.Mock; findOne: jest.Mock };
  let mockManager: {
    findOne: jest.Mock;
    findOneByOrFail: jest.Mock;
    find: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let categoria: CategoriaGasto | null;
  let egresoEnBd: Egreso | null;

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.TESORERO],
    modulos: [],
    idsUnidades: [],
  };

  const egreso = (cambios: Partial<Egreso> = {}) =>
    ({
      idEgreso: 5,
      idRed: 3,
      idCategoria: 8,
      categoria: { idCategoria: 8, nombre: 'Mantención' },
      monto: 150000,
      descripcion: 'Reparación portón',
      proveedor: null,
      fechaEgreso: '2026-11-05',
      comprobanteUrl: null,
      requiereVisado: true,
      estadoVisado: EstadoVisado.PENDIENTE,
      visadoPor: null,
      visadoEn: null,
      creadoPor: 7,
      ...cambios,
    }) as Egreso;

  const dto = (monto: number) =>
    ({
      idCategoria: 8,
      monto,
      descripcion: 'Reparación portón',
      fechaEgreso: '2026-11-05',
    }) as RegistrarEgresoDto;

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    categoria = { idCategoria: 8, activa: true } as CategoriaGasto;
    egresoEnBd = egreso();
    mockRepositorio = {
      find: jest.fn().mockResolvedValue([egreso()]),
      findOne: jest.fn(() => Promise.resolve(egreso())),
    };
    mockManager = {
      findOne: jest.fn((entidad: unknown) =>
        Promise.resolve(entidad === CategoriaGasto ? categoria : egresoEnBd),
      ),
      findOneByOrFail: jest
        .fn()
        .mockResolvedValue({ umbralVisado: 100000 } as RedVecinal),
      find: jest.fn().mockResolvedValue([
        {
          idUsuario: 7,
          nombre: 'Tomás',
          primerApellido: 'Soto',
          segundoApellido: null,
        } as Usuario,
      ]),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idEgreso: 5 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        EgresosService,
        { provide: getRepositoryToken(Egreso), useValue: mockRepositorio },
        {
          provide: DataSource,
          useValue: {
            manager: mockManager,
            transaction: (trabajo: (m: unknown) => unknown) =>
              trabajo(mockManager),
          },
        },
        { provide: BitacoraService, useValue: mockBitacoraService },
      ],
    }).compile();

    target = module.get(EgresosService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it.each([
    [99999, false, EstadoVisado.NO_REQUIERE],
    [100000, true, EstadoVisado.PENDIENTE],
    [150000, true, EstadoVisado.PENDIENTE],
  ])(
    'con un monto de %i debe dejar requiereVisado = %s y estado %s según el umbral de la comunidad',
    async (monto, requiereVisado, estadoVisado) => {
      await target.registrar(red, 7, dto(monto));

      expect(mockManager.insert).toHaveBeenCalledWith(
        Egreso,
        expect.objectContaining({
          idRed: 3,
          monto,
          requiereVisado,
          estadoVisado,
          creadoPor: 7,
        }),
      );
    },
  );

  it('debe registrar el egreso en la bitácora y devolverlo con el nombre de quien lo creó', async () => {
    const resultado = await target.registrar(red, 7, dto(150000));

    expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'registrar_egreso',
        entidad: 'egresos',
        idEntidad: 5,
      }),
      mockManager,
    );
    expect(resultado.creadoPor).toEqual({ idUsuario: 7, nombre: 'Tomás Soto' });
  });

  it('debe rechazar una categoría desactivada', async () => {
    categoria = { idCategoria: 8, activa: false } as CategoriaGasto;

    await expect(target.registrar(red, 7, dto(1000))).rejects.toThrow(
      new BadRequestException('La categoría no existe o está desactivada'),
    );
  });

  describe('visar', () => {
    it('debe aprobar un egreso pendiente con quién y cuándo', async () => {
      await target.visar(red, 9, 5, { aprobado: true });

      expect(mockManager.update).toHaveBeenCalledWith(
        Egreso,
        { idEgreso: 5, idRed: 3 },
        { estadoVisado: EstadoVisado.APROBADO, visadoPor: 9, visadoEn: AHORA },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'visar_egreso' }),
        mockManager,
      );
    });

    it('debe rechazar un egreso con su comentario', async () => {
      await target.visar(red, 9, 5, { aprobado: false, comentario: 'Caro' });

      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'rechazar_egreso',
          detalle: expect.objectContaining({ comentario: 'Caro' }),
        }),
        mockManager,
      );
    });

    it('debe rechazar visar un egreso que no espera visado', async () => {
      egresoEnBd = egreso({ estadoVisado: EstadoVisado.NO_REQUIERE });

      await expect(target.visar(red, 9, 5, { aprobado: true })).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe responder 404 por un egreso de otra comunidad', async () => {
      egresoEnBd = null;

      await expect(target.visar(red, 9, 5, { aprobado: true })).rejects.toThrow(
        new NotFoundException('Egreso no encontrado'),
      );
    });
  });
});
