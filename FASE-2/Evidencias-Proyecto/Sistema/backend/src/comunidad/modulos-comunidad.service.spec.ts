import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { aplicarCambioModulo } from '../redes-vecinales/cambiar-modulo';
import { Modulo } from '../redes-vecinales/entities/modulo.entity';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import {
  MENSAJE_MODULO_SOLO_PLATAFORMA,
  ModulosComunidadService,
} from './modulos-comunidad.service';

jest.mock('../redes-vecinales/cambiar-modulo', () => ({
  aplicarCambioModulo: jest.fn(),
}));

const ID_RED = 3;
const ID_ADMIN = 7;

const crearModulo = (codigo: CodigoModulo, nombre: string) =>
  ({ codigo, nombre, descripcion: `Descripción de ${nombre}` }) as Modulo;

const CATALOGO = [
  crearModulo(CodigoModulo.ADMINISTRADOR_EXTERNO, 'Administrador externo'),
  crearModulo(CodigoModulo.COBROS, 'Cobros'),
  crearModulo(CodigoModulo.MURO, 'Muro'),
];

const crearRedModulo = (codigoModulo: CodigoModulo) =>
  ({ idRed: ID_RED, codigoModulo, activo: true }) as RedModulo;

const LISTA_ESPERADA = [
  {
    codigo: CodigoModulo.ADMINISTRADOR_EXTERNO,
    nombre: 'Administrador externo',
    descripcion: 'Descripción de Administrador externo',
    activo: true,
    editable: false,
  },
  {
    codigo: CodigoModulo.COBROS,
    nombre: 'Cobros',
    descripcion: 'Descripción de Cobros',
    activo: false,
    editable: true,
  },
  {
    codigo: CodigoModulo.MURO,
    nombre: 'Muro',
    descripcion: 'Descripción de Muro',
    activo: true,
    editable: true,
  },
];

describe('ModulosComunidadService', () => {
  let target: ModulosComunidadService;
  let mockModulosRepository: jest.Mocked<Pick<Repository<Modulo>, 'find'>>;
  let mockRedModulosRepository: jest.Mocked<
    Pick<Repository<RedModulo>, 'find'>
  >;
  let mockManager: jest.Mocked<Pick<EntityManager, 'findOne'>>;
  let mockBitacoraService: jest.Mocked<
    Pick<BitacoraService, 'registrar' | 'marcarActividad'>
  >;
  const mockAplicarCambioModulo = jest.mocked(aplicarCambioModulo);

  beforeEach(async () => {
    mockModulosRepository = { find: jest.fn().mockResolvedValue(CATALOGO) };
    mockRedModulosRepository = {
      find: jest
        .fn()
        .mockResolvedValue([
          crearRedModulo(CodigoModulo.MURO),
          crearRedModulo(CodigoModulo.ADMINISTRADOR_EXTERNO),
        ]),
    };
    mockManager = {
      findOne: jest.fn().mockResolvedValue({ idRed: ID_RED }),
    } as unknown as typeof mockManager;
    mockBitacoraService = {
      registrar: jest.fn(),
      marcarActividad: jest.fn(),
    };

    const modulo = await Test.createTestingModule({
      providers: [
        ModulosComunidadService,
        {
          provide: getRepositoryToken(Modulo),
          useValue: mockModulosRepository,
        },
        {
          provide: getRepositoryToken(RedModulo),
          useValue: mockRedModulosRepository,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
              trabajo(mockManager),
            ),
          },
        },
        { provide: BitacoraService, useValue: mockBitacoraService },
      ],
    }).compile();

    target = modulo.get(ModulosComunidadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe devolver el catálogo con el estado de la comunidad y si se puede editar', async () => {
      const resultado = await target.listar(ID_RED);

      expect(resultado).toEqual(LISTA_ESPERADA);
    });

    it('debe leer solo los módulos encendidos de la comunidad del contexto', async () => {
      await target.listar(ID_RED);

      expect(mockModulosRepository.find).toHaveBeenCalledWith({
        order: { codigo: 'ASC' },
      });
      expect(mockRedModulosRepository.find).toHaveBeenCalledWith({
        where: { idRed: ID_RED, activo: true },
      });
    });
  });

  describe('cambiar', () => {
    it('debe rechazar el módulo de administrador externo sin abrir la transacción', async () => {
      await expect(
        target.cambiar(
          ID_RED,
          ID_ADMIN,
          CodigoModulo.ADMINISTRADOR_EXTERNO,
          false,
        ),
      ).rejects.toThrow(new ForbiddenException(MENSAJE_MODULO_SOLO_PLATAFORMA));

      expect(mockManager.findOne).not.toHaveBeenCalled();
      expect(mockAplicarCambioModulo).not.toHaveBeenCalled();
    });

    it('debe bloquear la comunidad y aplicar el cambio con el manager de la transacción', async () => {
      mockAplicarCambioModulo.mockResolvedValue(true);

      await target.cambiar(ID_RED, ID_ADMIN, CodigoModulo.COBROS, true);

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: ID_RED },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockAplicarCambioModulo).toHaveBeenCalledWith(
        mockManager,
        ID_RED,
        CodigoModulo.COBROS,
        true,
        ID_ADMIN,
      );
    });

    it.each([
      [true, 'activar_modulo'],
      [false, 'desactivar_modulo'],
    ])(
      'debe registrar en la bitácora de la comunidad cuando activo es %s',
      async (activo, accion) => {
        mockAplicarCambioModulo.mockResolvedValue(true);

        await target.cambiar(ID_RED, ID_ADMIN, CodigoModulo.MURO, activo);

        expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
          {
            ambito: AmbitoBitacora.COMUNIDAD,
            idRed: ID_RED,
            idUsuario: ID_ADMIN,
            accion,
            entidad: 'red_modulos',
            detalle: { modulo: CodigoModulo.MURO },
          },
          mockManager,
        );
      },
    );

    it('debe marcar la actividad de la comunidad después de registrar el cambio', async () => {
      mockAplicarCambioModulo.mockResolvedValue(true);

      await target.cambiar(ID_RED, ID_ADMIN, CodigoModulo.MURO, false);

      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(ID_RED);
      expect(
        mockBitacoraService.registrar.mock.invocationCallOrder[0],
      ).toBeLessThan(
        mockBitacoraService.marcarActividad.mock.invocationCallOrder[0],
      );
    });

    it('no debe registrar ni marcar actividad cuando el módulo ya estaba así', async () => {
      mockAplicarCambioModulo.mockResolvedValue(false);

      await target.cambiar(ID_RED, ID_ADMIN, CodigoModulo.MURO, true);

      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
    });

    it('debe devolver la lista actualizada de módulos', async () => {
      mockAplicarCambioModulo.mockResolvedValue(true);

      const resultado = await target.cambiar(
        ID_RED,
        ID_ADMIN,
        CodigoModulo.MURO,
        true,
      );

      expect(resultado).toEqual(LISTA_ESPERADA);
    });
  });
});
