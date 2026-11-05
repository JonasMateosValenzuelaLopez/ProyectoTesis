import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { GuardarGuiaDto } from './dto/guardar-guia.dto';
import { ComunidadGuia, DiaSemana } from './entities/comunidad-guia.entity';
import { GuiaService } from './guia.service';

const AHORA = new Date('2026-11-04T15:00:00Z');
const ACTUALIZADA = new Date('2026-10-20T13:00:00Z');

describe('GuiaService', () => {
  let target: GuiaService;
  let mockGuiasRepository: { findOne: jest.Mock };
  let mockMembresiasRepository: { find: jest.Mock };
  let mockManager: {
    findOne: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    restore: jest.Mock;
  };
  let mockDataSource: { transaction: jest.Mock };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let guiaEnBd: ComunidadGuia | null;

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.ADMINISTRADOR],
    modulos: [],
    idsUnidades: [],
  };

  const crearGuia = (cambios: Partial<ComunidadGuia> = {}): ComunidadGuia =>
    ({
      idRed: 3,
      mensaje: 'Somos 15 casas.',
      basuraDias: [DiaSemana.LUNES, DiaSemana.JUEVES],
      basuraHorario: 'Desde las 21:00',
      basuraLugar: 'Contenedor verde',
      reciclajeLugar: null,
      reciclajeDetalle: null,
      actualizadoPor: 7,
      actualizador: { idUsuario: 7, nombre: 'Carla' } as Usuario,
      fechaCreacion: ACTUALIZADA,
      fechaActualizacion: ACTUALIZADA,
      fechaEliminacion: null,
      ...cambios,
    }) as ComunidadGuia;

  const dtoIgual = {
    mensaje: 'Somos 15 casas.',
    basuraDias: [DiaSemana.JUEVES, DiaSemana.LUNES],
    basuraHorario: 'Desde las 21:00',
    basuraLugar: 'Contenedor verde',
  } as GuardarGuiaDto;

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    guiaEnBd = null;
    mockGuiasRepository = {
      findOne: jest.fn().mockResolvedValue(crearGuia()),
    };
    mockMembresiasRepository = {
      find: jest
        .fn()
        .mockResolvedValue([{ idRol: RolUsuario.ADMINISTRADOR } as Membresia]),
    };
    mockManager = {
      findOne: jest.fn((entidad: unknown) =>
        Promise.resolve(entidad === ComunidadGuia ? guiaEnBd : { idRed: 3 }),
      ),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idRed: 3 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      restore: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockDataSource = {
      transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
        trabajo(mockManager),
      ),
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        GuiaService,
        {
          provide: getRepositoryToken(ComunidadGuia),
          useValue: mockGuiasRepository,
        },
        {
          provide: getRepositoryToken(Membresia),
          useValue: mockMembresiasRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: BitacoraService, useValue: mockBitacoraService },
      ],
    }).compile();

    target = module.get(GuiaService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('obtener', () => {
    it('debe devolver la guía de la comunidad del contexto con la firma de quien la guardó', async () => {
      const resultado = await target.obtener(red);

      expect(mockGuiasRepository.findOne).toHaveBeenCalledWith({
        where: { idRed: 3 },
        relations: { actualizador: true },
      });
      expect(resultado).toEqual({
        mensaje: 'Somos 15 casas.',
        basuraDias: [DiaSemana.LUNES, DiaSemana.JUEVES],
        basuraHorario: 'Desde las 21:00',
        basuraLugar: 'Contenedor verde',
        reciclajeLugar: null,
        reciclajeDetalle: null,
        firma: { nombre: 'Carla', cargo: 'Administrador' },
        fechaActualizacion: ACTUALIZADA,
      });
    });

    it('debe devolver la guía vacía cuando la comunidad todavía no tiene una', async () => {
      mockGuiasRepository.findOne.mockResolvedValue(null);

      const resultado = await target.obtener(red);

      expect(resultado).toEqual({
        mensaje: null,
        basuraDias: [],
        basuraHorario: null,
        basuraLugar: null,
        reciclajeLugar: null,
        reciclajeDetalle: null,
        firma: null,
        fechaActualizacion: null,
      });
      expect(mockMembresiasRepository.find).not.toHaveBeenCalled();
    });

    it('debe entregar los días en el orden de la semana', async () => {
      mockGuiasRepository.findOne.mockResolvedValue(
        crearGuia({
          basuraDias: [DiaSemana.DOMINGO, DiaSemana.LUNES, DiaSemana.MIERCOLES],
        }),
      );

      const { basuraDias } = await target.obtener(red);

      expect(basuraDias).toEqual([
        DiaSemana.LUNES,
        DiaSemana.MIERCOLES,
        DiaSemana.DOMINGO,
      ]);
    });

    it('debe buscar solo los cargos vigentes de quien guardó en esta comunidad', async () => {
      await target.obtener(red);

      expect(mockMembresiasRepository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          idUsuario: 7,
          idRed: 3,
          activo: true,
          idRol: In([
            RolUsuario.ADMINISTRADOR,
            RolUsuario.SECRETARIO,
            RolUsuario.PRESIDENTE,
          ]),
        }),
      });
    });

    it.each([
      [[RolUsuario.PRESIDENTE, RolUsuario.SECRETARIO], 'Secretario'],
      [[RolUsuario.PRESIDENTE], 'Presidente'],
      [[RolUsuario.SECRETARIO, RolUsuario.ADMINISTRADOR], 'Administrador'],
    ])(
      'con los cargos %j debe firmar como %s',
      async (roles: RolUsuario[], cargo: string) => {
        mockMembresiasRepository.find.mockResolvedValue(
          roles.map((idRol) => ({ idRol }) as Membresia),
        );

        const { firma } = await target.obtener(red);

        expect(firma).toEqual({ nombre: 'Carla', cargo });
      },
    );

    it('debe firmar solo con el nombre cuando quien guardó ya no tiene cargo', async () => {
      mockMembresiasRepository.find.mockResolvedValue([]);

      const { firma } = await target.obtener(red);

      expect(firma).toEqual({ nombre: 'Carla', cargo: null });
    });

    it('debe dejar la firma en null cuando la cuenta de quien guardó fue eliminada', async () => {
      mockGuiasRepository.findOne.mockResolvedValue(
        crearGuia({ actualizador: null }),
      );

      const { firma } = await target.obtener(red);

      expect(firma).toBeNull();
    });
  });

  describe('guardar', () => {
    it('debe crear la guía con la comunidad del contexto y el usuario del token, bloqueando la comunidad', async () => {
      await target.guardar(red, 7, { mensaje: 'Hola' } as GuardarGuiaDto);

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.findOne).toHaveBeenCalledWith(ComunidadGuia, {
        where: { idRed: 3 },
        withDeleted: true,
      });
      expect(mockManager.insert).toHaveBeenCalledWith(ComunidadGuia, {
        mensaje: 'Hola',
        basuraDias: null,
        basuraHorario: null,
        basuraLugar: null,
        reciclajeLugar: null,
        reciclajeDetalle: null,
        idRed: 3,
        actualizadoPor: 7,
      });
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe registrar en la bitácora, dentro de la transacción, qué campos se llenaron al crearla', async () => {
      await target.guardar(red, 7, {
        mensaje: 'Hola',
        basuraDias: [DiaSemana.MARTES],
      } as GuardarGuiaDto);

      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: 7,
          accion: 'guardar_guia_comunidad',
          entidad: 'comunidad_guias',
          idEntidad: 3,
          detalle: { campos: ['mensaje', 'basuraDias'], nueva: true },
        },
        mockManager,
      );
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe reemplazar la guía completa, dejando en null lo que no llega, y registrar solo lo que cambió', async () => {
      guiaEnBd = crearGuia();

      await target.guardar(red, 9, {
        mensaje: 'Somos 15 casas.',
        reciclajeLugar: 'Punto limpio',
      } as GuardarGuiaDto);

      expect(mockManager.update).toHaveBeenCalledWith(
        ComunidadGuia,
        { idRed: 3 },
        {
          mensaje: 'Somos 15 casas.',
          basuraDias: null,
          basuraHorario: null,
          basuraLugar: null,
          reciclajeLugar: 'Punto limpio',
          reciclajeDetalle: null,
          actualizadoPor: 9,
        },
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          idUsuario: 9,
          detalle: {
            campos: [
              'basuraDias',
              'basuraHorario',
              'basuraLugar',
              'reciclajeLugar',
            ],
            nueva: false,
          },
        }),
        mockManager,
      );
    });

    it('debe guardar los días en el orden de la semana', async () => {
      await target.guardar(red, 7, {
        basuraDias: [DiaSemana.VIERNES, DiaSemana.LUNES],
      } as GuardarGuiaDto);

      expect(mockManager.insert).toHaveBeenCalledWith(
        ComunidadGuia,
        expect.objectContaining({
          basuraDias: [DiaSemana.LUNES, DiaSemana.VIERNES],
        }),
      );
    });

    it('debe guardar una lista de días vacía como null', async () => {
      guiaEnBd = crearGuia();

      await target.guardar(red, 7, {
        ...dtoIgual,
        basuraDias: [],
      } as GuardarGuiaDto);

      expect(mockManager.update).toHaveBeenCalledWith(
        ComunidadGuia,
        { idRed: 3 },
        expect.objectContaining({ basuraDias: null }),
      );
    });

    it('no debe escribir ni registrar nada cuando la guía no cambió', async () => {
      guiaEnBd = crearGuia();

      const resultado = await target.guardar(red, 9, dtoIgual);

      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
      expect(resultado.firma).toEqual({
        nombre: 'Carla',
        cargo: 'Administrador',
      });
    });

    it('debe restaurar y reemplazar una guía que estaba eliminada', async () => {
      guiaEnBd = crearGuia({ fechaEliminacion: ACTUALIZADA });

      await target.guardar(red, 7, dtoIgual);

      expect(mockManager.restore).toHaveBeenCalledWith(ComunidadGuia, {
        idRed: 3,
      });
      expect(mockManager.update).toHaveBeenCalled();
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          detalle: {
            campos: ['mensaje', 'basuraDias', 'basuraHorario', 'basuraLugar'],
            nueva: true,
          },
        }),
        mockManager,
      );
    });

    it('debe devolver la guía como queda después de guardar', async () => {
      const resultado = await target.guardar(red, 7, dtoIgual);

      expect(mockGuiasRepository.findOne).toHaveBeenCalledWith({
        where: { idRed: 3 },
        relations: { actualizador: true },
      });
      expect(resultado.mensaje).toBe('Somos 15 casas.');
    });

    it('no debe marcar actividad cuando la transacción falla', async () => {
      mockManager.insert.mockRejectedValue(new Error('Error de BD'));

      await expect(
        target.guardar(red, 7, { mensaje: 'Hola' } as GuardarGuiaDto),
      ).rejects.toThrow('Error de BD');

      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
    });
  });
});
