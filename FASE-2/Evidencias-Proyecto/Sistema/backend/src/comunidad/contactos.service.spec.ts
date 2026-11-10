import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { ContactosService } from './contactos.service';
import { GuardarContactoDto } from './dto/guardar-contacto.dto';
import { ComunidadContacto } from './entities/comunidad-contacto.entity';

describe('ContactosService', () => {
  let target: ContactosService;
  let mockContactosRepository: { find: jest.Mock; findOne: jest.Mock };
  let mockManager: {
    findOne: jest.Mock;
    count: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let mockDataSource: { transaction: jest.Mock };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let contactoEnBd: ComunidadContacto | null;

  const redCon = (roles: RolUsuario[]): ContextoRed => ({
    idRed: 3,
    roles,
    modulos: [],
    idsUnidades: [],
  });
  const secretaria = redCon([RolUsuario.SECRETARIO]);

  const crearContacto = (
    cambios: Partial<ComunidadContacto> = {},
  ): ComunidadContacto =>
    ({
      idContacto: 5,
      idRed: 3,
      nombre: 'Conserjería',
      detalle: 'Visitas y encomiendas',
      telefono: '+56452210890',
      horario: null,
      visible: true,
      fechaEliminacion: null,
      ...cambios,
    }) as ComunidadContacto;

  const contactoSerializado = {
    idContacto: 5,
    nombre: 'Conserjería',
    detalle: 'Visitas y encomiendas',
    telefono: '+56452210890',
    horario: null,
    visible: true,
  };

  const dtoIgual = {
    nombre: 'Conserjería',
    detalle: 'Visitas y encomiendas',
    telefono: '+56452210890',
  } as GuardarContactoDto;

  beforeEach(async () => {
    contactoEnBd = crearContacto();
    mockContactosRepository = {
      find: jest.fn().mockResolvedValue([crearContacto()]),
      findOne: jest.fn().mockResolvedValue(crearContacto()),
    };
    mockManager = {
      findOne: jest.fn((entidad: unknown) =>
        Promise.resolve(
          entidad === ComunidadContacto ? contactoEnBd : { idRed: 3 },
        ),
      ),
      count: jest.fn().mockResolvedValue(0),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idContacto: 5 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
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
        ContactosService,
        {
          provide: getRepositoryToken(ComunidadContacto),
          useValue: mockContactosRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: BitacoraService, useValue: mockBitacoraService },
      ],
    }).compile();

    target = module.get(ContactosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it.each([
      [[RolUsuario.RESIDENTE]],
      [[RolUsuario.TESORERO]],
      [[RolUsuario.CONSERJE]],
    ])(
      'con los cargos %j debe devolver solo los contactos visibles',
      async (roles: RolUsuario[]) => {
        const resultado = await target.listar(redCon(roles));

        expect(mockContactosRepository.find).toHaveBeenCalledWith({
          where: { idRed: 3, visible: true },
          order: { idContacto: 'ASC' },
        });
        expect(resultado).toEqual([contactoSerializado]);
      },
    );

    it.each([
      [[RolUsuario.ADMINISTRADOR]],
      [[RolUsuario.SECRETARIO]],
      [[RolUsuario.PRESIDENTE]],
      [[RolUsuario.RESIDENTE, RolUsuario.SECRETARIO]],
    ])(
      'con los cargos %j debe devolver también los ocultos',
      async (roles: RolUsuario[]) => {
        await target.listar(redCon(roles));

        expect(mockContactosRepository.find).toHaveBeenCalledWith({
          where: { idRed: 3 },
          order: { idContacto: 'ASC' },
        });
      },
    );
  });

  describe('crear', () => {
    it('debe insertar en la comunidad del contexto, bloqueándola y visible por defecto', async () => {
      const resultado = await target.crear(secretaria, 7, dtoIgual);

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.count).toHaveBeenCalledWith(ComunidadContacto, {
        where: { idRed: 3 },
      });
      expect(mockManager.insert).toHaveBeenCalledWith(ComunidadContacto, {
        nombre: 'Conserjería',
        detalle: 'Visitas y encomiendas',
        telefono: '+56452210890',
        horario: null,
        visible: true,
        idRed: 3,
      });
      expect(resultado).toEqual(contactoSerializado);
    });

    it('debe registrar la creación en la bitácora dentro de la transacción y marcar actividad', async () => {
      await target.crear(secretaria, 7, dtoIgual);

      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: 7,
          accion: 'crear_contacto',
          entidad: 'comunidad_contactos',
          idEntidad: 5,
          detalle: { nombre: 'Conserjería' },
        },
        mockManager,
      );
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe lanzar ConflictException cuando la comunidad ya tiene 100 contactos', async () => {
      mockManager.count.mockResolvedValue(100);

      await expect(target.crear(secretaria, 7, dtoIgual)).rejects.toThrow(
        new ConflictException(
          'La comunidad ya tiene el máximo de 100 contactos',
        ),
      );

      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('debe buscar el contacto en la comunidad del contexto y bloquearlo', async () => {
      await target.actualizar(secretaria, 7, 5, {
        ...dtoIgual,
        visible: false,
      });

      expect(mockManager.findOne).toHaveBeenCalledWith(ComunidadContacto, {
        where: { idContacto: 5, idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('debe reemplazar el contacto y registrar solo los campos que cambiaron', async () => {
      await target.actualizar(secretaria, 7, 5, {
        nombre: 'Conserjería',
        telefono: '+56452210891',
        visible: false,
      } as GuardarContactoDto);

      expect(mockManager.update).toHaveBeenCalledWith(
        ComunidadContacto,
        { idContacto: 5, idRed: 3 },
        {
          nombre: 'Conserjería',
          detalle: null,
          telefono: '+56452210891',
          horario: null,
          visible: false,
        },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'actualizar_contacto',
          idEntidad: 5,
          detalle: {
            nombre: 'Conserjería',
            campos: ['detalle', 'telefono', 'visible'],
          },
        }),
        mockManager,
      );
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('no debe escribir ni registrar nada cuando el contacto no cambió', async () => {
      const resultado = await target.actualizar(secretaria, 7, 5, dtoIgual);

      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
      expect(resultado).toEqual(contactoSerializado);
    });

    it('debe lanzar NotFoundException cuando el contacto no es de la comunidad', async () => {
      contactoEnBd = null;

      await expect(
        target.actualizar(secretaria, 7, 99, dtoIgual),
      ).rejects.toThrow(new NotFoundException('Contacto no encontrado'));

      expect(mockManager.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('debe hacer borrado lógico en la comunidad del contexto y registrarlo', async () => {
      await target.eliminar(secretaria, 7, 5);

      expect(mockManager.softDelete).toHaveBeenCalledWith(ComunidadContacto, {
        idContacto: 5,
        idRed: 3,
      });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'eliminar_contacto',
          idEntidad: 5,
          detalle: { nombre: 'Conserjería' },
        }),
        mockManager,
      );
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe lanzar NotFoundException cuando el contacto no es de la comunidad', async () => {
      contactoEnBd = null;

      await expect(target.eliminar(secretaria, 7, 99)).rejects.toThrow(
        new NotFoundException('Contacto no encontrado'),
      );

      expect(mockManager.softDelete).not.toHaveBeenCalled();
      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
    });
  });
});
