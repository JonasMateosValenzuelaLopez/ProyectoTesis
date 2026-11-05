import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import {
  EstadoRedVecinal,
  RedVecinal,
  TipoRedVecinal,
} from '../redes-vecinales/entities/red-vecinal.entity';
import { TipoUnidad, Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { PlataformaService } from './plataforma.service';

const AHORA = new Date('2026-11-05T15:00:00Z');
const CREADA = new Date('2025-01-10T12:00:00Z');

describe('PlataformaService', () => {
  let target: PlataformaService;
  let mockRedesRepository: { find: jest.Mock; findOne: jest.Mock };
  let mockConsulta: Record<string, jest.Mock>;
  let mockUnidadesRepository: {
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockMembresiasRepository: { find: jest.Mock };
  let mockRedModulosRepository: { find: jest.Mock };
  let mockManager: {
    findOne: jest.Mock;
    update: jest.Mock;
    insert: jest.Mock;
    restore: jest.Mock;
  };
  let moduloEnBd: RedModulo | null;
  let mockDataSource: { transaction: jest.Mock; manager: object };
  let mockBitacoraService: { registrar: jest.Mock };
  let redEnBd: RedVecinal | null;

  const crearRed = (cambios: Partial<RedVecinal> = {}): RedVecinal =>
    ({
      idRed: 1,
      nombre: 'Condominio Las Palmas',
      tipo: TipoRedVecinal.CONDOMINIO,
      direccion: 'Av. Siempre Viva 123',
      estado: EstadoRedVecinal.ACTIVA,
      motivoSuspension: null,
      fechaCreacion: CREADA,
      ultimaActividad: AHORA,
      ...cambios,
    }) as RedVecinal;

  const usuario = (idUsuario: number, nombre: string): Usuario =>
    ({
      idUsuario,
      nombre,
      primerApellido: 'Pérez',
      segundoApellido: null,
      pais: 'CL',
      identificador: `${idUsuario}`,
      correo: `${nombre.toLowerCase()}@correo.cl`,
    }) as Usuario;

  const membresia = (
    idUsuario: number,
    nombre: string,
    idRol: RolUsuario,
    idRed = 1,
  ): Membresia =>
    ({
      idUsuario,
      idRed,
      idRol,
      usuario: usuario(idUsuario, nombre),
    }) as Membresia;

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    redEnBd = crearRed();
    moduloEnBd = null;
    mockRedesRepository = {
      find: jest.fn().mockResolvedValue([crearRed()]),
      findOne: jest.fn(() => Promise.resolve(redEnBd)),
    };
    mockConsulta = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ idRed: 1, total: '48' }]),
    };
    mockUnidadesRepository = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(mockConsulta),
    };
    mockMembresiasRepository = {
      find: jest
        .fn()
        .mockResolvedValue([
          membresia(10, 'Ana', RolUsuario.TESORERO),
          membresia(11, 'Luis', RolUsuario.PRESIDENTE),
          membresia(12, 'Rosa', RolUsuario.RESIDENTE),
          membresia(11, 'Luis', RolUsuario.RESIDENTE),
        ]),
    };
    mockRedModulosRepository = {
      find: jest
        .fn()
        .mockResolvedValue([
          { idRed: 1, codigoModulo: CodigoModulo.COBROS } as RedModulo,
        ]),
    };
    mockManager = {
      findOne: jest.fn((entidad: unknown) =>
        Promise.resolve(entidad === RedModulo ? moduloEnBd : redEnBd),
      ),
      insert: jest.fn().mockResolvedValue({ identifiers: [] }),
      restore: jest.fn().mockResolvedValue({ affected: 1 }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockDataSource = {
      transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
        trabajo(mockManager),
      ),
      manager: { soy: 'manager por defecto' },
    };
    mockBitacoraService = { registrar: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        PlataformaService,
        {
          provide: getRepositoryToken(RedVecinal),
          useValue: mockRedesRepository,
        },
        {
          provide: getRepositoryToken(Unidad),
          useValue: mockUnidadesRepository,
        },
        {
          provide: getRepositoryToken(Membresia),
          useValue: mockMembresiasRepository,
        },
        {
          provide: getRepositoryToken(RedModulo),
          useValue: mockRedModulosRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: BitacoraService, useValue: mockBitacoraService },
      ],
    }).compile();

    target = module.get(PlataformaService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe devolver cada comunidad con sus conteos, módulos activos y responsable', async () => {
      const resultado = await target.listar();

      expect(resultado).toEqual([
        {
          idRed: 1,
          nombre: 'Condominio Las Palmas',
          tipo: TipoRedVecinal.CONDOMINIO,
          direccion: 'Av. Siempre Viva 123',
          estado: EstadoRedVecinal.ACTIVA,
          motivoSuspension: null,
          fechaCreacion: CREADA,
          ultimaActividad: AHORA,
          totalUnidades: 48,
          totalPersonas: 3,
          modulos: [CodigoModulo.COBROS],
          responsable: {
            idUsuario: 11,
            nombre: 'Luis Pérez',
            pais: 'CL',
            identificador: '11',
            correo: 'luis@correo.cl',
            cargo: 'Presidente',
          },
        },
      ]);
    });

    it('debe consultar las membresías vigentes y los módulos activos de todas las comunidades a la vez', async () => {
      mockRedesRepository.find.mockResolvedValue([
        crearRed(),
        crearRed({ idRed: 2 }),
      ]);

      await target.listar();

      expect(mockMembresiasRepository.find).toHaveBeenCalledTimes(1);
      expect(mockMembresiasRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ idRed: In([1, 2]), activo: true }),
          relations: { usuario: true },
        }),
      );
      expect(mockRedModulosRepository.find).toHaveBeenCalledWith({
        where: { idRed: In([1, 2]), activo: true },
        order: { codigoModulo: 'ASC' },
      });
    });

    it('debe preferir al Administrador como responsable', async () => {
      mockMembresiasRepository.find.mockResolvedValue([
        membresia(20, 'Carla', RolUsuario.ADMINISTRADOR),
        membresia(11, 'Luis', RolUsuario.PRESIDENTE),
      ]);

      const [comunidad] = await target.listar();

      expect(comunidad.responsable).toEqual(
        expect.objectContaining({ idUsuario: 20, cargo: 'Administrador' }),
      );
    });

    it('debe dejar el responsable en null y los conteos en 0 cuando la comunidad no tiene nada', async () => {
      mockMembresiasRepository.find.mockResolvedValue([]);
      mockRedModulosRepository.find.mockResolvedValue([]);
      mockConsulta.getRawMany.mockResolvedValue([]);

      const [comunidad] = await target.listar();

      expect(comunidad).toEqual(
        expect.objectContaining({
          totalUnidades: 0,
          totalPersonas: 0,
          modulos: [],
          responsable: null,
        }),
      );
    });

    it('no debe contar membresías cuyo usuario fue eliminado', async () => {
      mockMembresiasRepository.find.mockResolvedValue([
        { ...membresia(30, 'X', RolUsuario.ADMINISTRADOR), usuario: null },
      ]);

      const [comunidad] = await target.listar();

      expect(comunidad.totalPersonas).toBe(0);
      expect(comunidad.responsable).toBeNull();
    });

    it('no debe consultar nada más cuando no hay comunidades', async () => {
      mockRedesRepository.find.mockResolvedValue([]);

      const resultado = await target.listar();

      expect(resultado).toEqual([]);
      expect(mockMembresiasRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('ficha', () => {
    it('debe agregar las unidades y la directiva sin residentes, con sus cargos agrupados', async () => {
      mockUnidadesRepository.find.mockResolvedValue([
        {
          idUnidad: 5,
          numeroIdentificador: '27',
          tipo: TipoUnidad.CASA,
          callePasaje: 'Pasaje 1',
          torre: null,
          piso: null,
          manzana: null,
          orden: 1,
          estacionamiento: 'E-3',
        } as Unidad,
      ]);
      mockMembresiasRepository.find.mockResolvedValue([
        membresia(11, 'Luis', RolUsuario.PRESIDENTE),
        membresia(11, 'Luis', RolUsuario.TESORERO),
        membresia(12, 'Rosa', RolUsuario.RESIDENTE),
      ]);

      const resultado = await target.ficha(1, 99);

      expect(mockUnidadesRepository.find).toHaveBeenCalledWith({
        where: { idRed: 1 },
        order: { orden: 'ASC', idUnidad: 'ASC' },
      });
      expect(resultado.unidades).toEqual([
        {
          idUnidad: 5,
          numeroIdentificador: '27',
          tipo: TipoUnidad.CASA,
          callePasaje: 'Pasaje 1',
          torre: null,
          piso: null,
          manzana: null,
          orden: 1,
        },
      ]);
      expect(resultado.directiva).toEqual([
        {
          idUsuario: 11,
          nombre: 'Luis Pérez',
          pais: 'CL',
          identificador: '11',
          correo: 'luis@correo.cl',
          cargos: ['Presidente', 'Tesorero'],
        },
      ]);
    });

    it('debe registrar en la bitácora de plataforma que se abrió la ficha', async () => {
      await target.ficha(1, 99);

      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.PLATAFORMA,
          idRed: 1,
          idUsuario: 99,
          accion: 'abrir_ficha_comunidad',
          entidad: 'redes_vecinales',
          idEntidad: 1,
          detalle: undefined,
        },
        mockDataSource.manager,
      );
    });

    it('debe lanzar NotFoundException sin registrar nada cuando la comunidad no existe', async () => {
      redEnBd = null;

      await expect(target.ficha(77, 99)).rejects.toThrow(
        new NotFoundException('Comunidad no encontrada'),
      );

      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
    });
  });

  describe('suspender', () => {
    it('debe bloquear la comunidad, suspenderla con el motivo y registrarlo en la misma transacción', async () => {
      await target.suspender(1, 99, 'Pidió pausar el servicio');

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        RedVecinal,
        { idRed: 1 },
        {
          estado: EstadoRedVecinal.SUSPENDIDA,
          motivoSuspension: 'Pidió pausar el servicio',
        },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          ambito: AmbitoBitacora.PLATAFORMA,
          idRed: 1,
          idUsuario: 99,
          accion: 'suspender_comunidad',
          detalle: { motivo: 'Pidió pausar el servicio' },
        }),
        mockManager,
      );
    });

    it('debe devolver el resumen de la comunidad como queda', async () => {
      const resultado = await target.suspender(1, 99, 'Motivo');

      expect(resultado).toEqual(expect.objectContaining({ idRed: 1 }));
    });

    it('debe lanzar ConflictException cuando ya está suspendida', async () => {
      redEnBd = crearRed({ estado: EstadoRedVecinal.SUSPENDIDA });

      await expect(target.suspender(1, 99, 'Motivo')).rejects.toThrow(
        new ConflictException('La comunidad ya está suspendida'),
      );

      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException cuando la comunidad no existe', async () => {
      redEnBd = null;

      await expect(target.suspender(77, 99, 'Motivo')).rejects.toThrow(
        new NotFoundException('Comunidad no encontrada'),
      );
    });
  });

  describe('reactivar', () => {
    it('debe reactivar, borrar el motivo y guardar en la bitácora el motivo anterior', async () => {
      redEnBd = crearRed({
        estado: EstadoRedVecinal.SUSPENDIDA,
        motivoSuspension: 'Deuda',
      });

      await target.reactivar(1, 99);

      expect(mockManager.update).toHaveBeenCalledWith(
        RedVecinal,
        { idRed: 1 },
        { estado: EstadoRedVecinal.ACTIVA, motivoSuspension: null },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'reactivar_comunidad',
          detalle: { motivoAnterior: 'Deuda' },
        }),
        mockManager,
      );
    });

    it('debe lanzar ConflictException cuando ya está activa', async () => {
      await expect(target.reactivar(1, 99)).rejects.toThrow(
        new ConflictException('La comunidad ya está activa'),
      );

      expect(mockManager.update).not.toHaveBeenCalled();
    });
  });

  describe('cambiarModulo', () => {
    it('debe crear la fila activa cuando el módulo nunca existió y registrarlo', async () => {
      await target.cambiarModulo(1, 99, CodigoModulo.RESERVAS, true);

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.findOne).toHaveBeenCalledWith(RedModulo, {
        where: { idRed: 1, codigoModulo: CodigoModulo.RESERVAS },
        withDeleted: true,
      });
      expect(mockManager.insert).toHaveBeenCalledWith(RedModulo, {
        idRed: 1,
        codigoModulo: CodigoModulo.RESERVAS,
        activo: true,
        actualizadoPor: 99,
      });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.PLATAFORMA,
          idRed: 1,
          idUsuario: 99,
          accion: 'activar_modulo',
          entidad: 'red_modulos',
          idEntidad: 1,
          detalle: { modulo: CodigoModulo.RESERVAS },
        },
        mockManager,
      );
    });

    it('debe desactivar una fila existente sin borrarla', async () => {
      moduloEnBd = {
        idRed: 1,
        codigoModulo: CodigoModulo.COBROS,
        activo: true,
        fechaEliminacion: null,
      } as RedModulo;

      await target.cambiarModulo(1, 99, CodigoModulo.COBROS, false);

      expect(mockManager.update).toHaveBeenCalledWith(
        RedModulo,
        { idRed: 1, codigoModulo: CodigoModulo.COBROS },
        { activo: false, actualizadoPor: 99 },
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'desactivar_modulo' }),
        mockManager,
      );
    });

    it('debe restaurar una fila eliminada antes de activarla', async () => {
      moduloEnBd = {
        idRed: 1,
        codigoModulo: CodigoModulo.MURO,
        activo: true,
        fechaEliminacion: CREADA,
      } as RedModulo;

      await target.cambiarModulo(1, 99, CodigoModulo.MURO, true);

      expect(mockManager.restore).toHaveBeenCalledWith(RedModulo, {
        idRed: 1,
        codigoModulo: CodigoModulo.MURO,
      });
      expect(mockManager.update).toHaveBeenCalled();
    });

    it.each([
      ['activar uno ya activo', true, true],
      ['desactivar uno ya inactivo', false, false],
    ])(
      'no debe escribir ni registrar nada al %s',
      async (_caso, estado: boolean, pedido: boolean) => {
        moduloEnBd = {
          idRed: 1,
          codigoModulo: CodigoModulo.MURO,
          activo: estado,
          fechaEliminacion: null,
        } as RedModulo;

        await target.cambiarModulo(1, 99, CodigoModulo.MURO, pedido);

        expect(mockManager.update).not.toHaveBeenCalled();
        expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
      },
    );

    it('no debe crear una fila para desactivar un módulo que nunca existió', async () => {
      await target.cambiarModulo(1, 99, CodigoModulo.MURO, false);

      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException cuando la comunidad no existe', async () => {
      redEnBd = null;

      await expect(
        target.cambiarModulo(77, 99, CodigoModulo.MURO, true),
      ).rejects.toThrow(new NotFoundException('Comunidad no encontrada'));
    });
  });

  describe('cambiarTipo', () => {
    it('debe cambiar el tipo y registrar el anterior y el nuevo', async () => {
      await target.cambiarTipo(1, 99, TipoRedVecinal.EDIFICIO);

      expect(mockManager.update).toHaveBeenCalledWith(
        RedVecinal,
        { idRed: 1 },
        { tipo: TipoRedVecinal.EDIFICIO },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'cambiar_tipo_comunidad',
          entidad: 'redes_vecinales',
          detalle: {
            anterior: TipoRedVecinal.CONDOMINIO,
            nuevo: TipoRedVecinal.EDIFICIO,
          },
        }),
        mockManager,
      );
    });

    it('no debe escribir ni registrar nada cuando el tipo es el mismo', async () => {
      await target.cambiarTipo(1, 99, TipoRedVecinal.CONDOMINIO);

      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
    });
  });
});
