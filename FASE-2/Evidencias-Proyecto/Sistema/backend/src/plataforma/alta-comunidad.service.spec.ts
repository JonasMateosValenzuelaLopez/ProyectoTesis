import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { TipoTokenPassword } from '../auth/entities/token-password.entity';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { MailService } from '../mail/mail.service';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import {
  RedVecinal,
  TipoRedVecinal,
} from '../redes-vecinales/entities/red-vecinal.entity';
import { EspacioComun } from '../reservas/entities/espacio-comun.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CuentasService } from '../usuarios/cuentas.service';
import { AltaComunidadService } from './alta-comunidad.service';
import { CrearComunidadDto } from './dto/crear-comunidad.dto';
import { PlataformaService } from './plataforma.service';

const AHORA = new Date('2026-11-05T15:00:00Z');

describe('AltaComunidadService', () => {
  let target: AltaComunidadService;
  let mockManager: {
    insert: jest.Mock;
    findOne: jest.Mock;
    restore: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    exists: jest.Mock;
  };
  let mockDataSource: { transaction: jest.Mock };
  let mockBitacoraService: { registrar: jest.Mock };
  let mockAuthService: {
    emitirTokenPassword: jest.Mock;
    urlRestablecer: jest.Mock;
  };
  let mockMailService: { enviar: jest.Mock };
  let mockPlataformaService: { resumenDe: jest.Mock };
  let porIdentificador: Usuario | null;
  let porCorreo: Usuario | null;

  const dto = (cambios: Partial<CrearComunidadDto> = {}): CrearComunidadDto =>
    ({
      nombre: 'Condominio Los Robles',
      direccion: 'Av. Los Robles 1200',
      tipo: TipoRedVecinal.CONDOMINIO,
      estructura: { norte: 2, sur: 1 },
      modulos: [CodigoModulo.MURO, CodigoModulo.COBROS],
      espacios: ['Quincho'],
      responsable: {
        identificador: '12345678-5',
        nombre: 'Ana',
        primerApellido: 'Soto',
        correo: 'ana@correo.cl',
      },
      ...cambios,
    }) as CrearComunidadDto;

  const cuentaExistente = (cambios: Partial<Usuario> = {}): Usuario =>
    ({
      idUsuario: 40,
      pais: 'CL',
      identificador: '12345678-5',
      nombre: 'Ana',
      correo: 'ana@correo.cl',
      esPlataforma: false,
      bloqueado: false,
      fechaEliminacion: null,
      ...cambios,
    }) as Usuario;

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    porIdentificador = null;
    porCorreo = null;
    mockManager = {
      insert: jest.fn((entidad: unknown) =>
        Promise.resolve({
          identifiers: entidad === RedVecinal ? [{ idRed: 7 }] : [],
        }),
      ),
      findOne: jest.fn(
        (entidad: unknown, opciones: { where: { correo?: string } }) =>
          Promise.resolve(
            entidad === Membresia
              ? null
              : opciones.where.correo
                ? porCorreo
                : porIdentificador,
          ),
      ),
      restore: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((_entidad: unknown, datos: object) => datos),
      save: jest.fn((datos: object) =>
        Promise.resolve({ ...datos, idUsuario: 50 }),
      ),
      exists: jest.fn().mockResolvedValue(false),
    };
    mockDataSource = {
      transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
        trabajo(mockManager),
      ),
    };
    mockBitacoraService = { registrar: jest.fn().mockResolvedValue(undefined) };
    mockAuthService = {
      emitirTokenPassword: jest.fn().mockResolvedValue('token-123'),
      urlRestablecer: jest.fn(
        (token: string) => `http://panel/restablecer?token=${token}`,
      ),
    };
    mockMailService = { enviar: jest.fn().mockResolvedValue(true) };
    mockPlataformaService = {
      resumenDe: jest.fn().mockResolvedValue({ idRed: 7, nombre: 'Robles' }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AltaComunidadService,
        CuentasService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: BitacoraService, useValue: mockBitacoraService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MailService, useValue: mockMailService },
        { provide: PlataformaService, useValue: mockPlataformaService },
      ],
    }).compile();

    target = module.get(AltaComunidadService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const insertado = (entidad: unknown) =>
    mockManager.insert.mock.calls.find(([e]) => e === entidad)?.[1];

  it('debe crear la comunidad con quien la creó, sus unidades, módulos y espacios', async () => {
    await target.crear(99, dto());

    expect(insertado(RedVecinal)).toEqual({
      nombre: 'Condominio Los Robles',
      direccion: 'Av. Los Robles 1200',
      tipo: TipoRedVecinal.CONDOMINIO,
      creadaPor: 99,
    });
    expect(insertado(Unidad)).toEqual([
      expect.objectContaining({
        idRed: 7,
        numeroIdentificador: '1',
        callePasaje: 'Lado norte',
        orden: 1,
      }),
      expect.objectContaining({ idRed: 7, numeroIdentificador: '2' }),
      expect.objectContaining({
        idRed: 7,
        numeroIdentificador: '3',
        callePasaje: 'Lado sur',
      }),
    ]);
    expect(insertado(RedModulo)).toEqual([
      {
        idRed: 7,
        codigoModulo: CodigoModulo.MURO,
        activo: true,
        actualizadoPor: 99,
      },
      {
        idRed: 7,
        codigoModulo: CodigoModulo.COBROS,
        activo: true,
        actualizadoPor: 99,
      },
    ]);
    expect(insertado(EspacioComun)).toEqual([
      { idRed: 7, nombre: 'Quincho', estado: true },
    ]);
  });

  it('debe insertar las unidades en tandas de 500', async () => {
    await target.crear(
      99,
      dto({
        tipo: TipoRedVecinal.VILLA,
        estructura: { manzanas: 12, casasPorManzana: 100 },
      }),
    );

    const tandas = mockManager.insert.mock.calls
      .filter(([entidad]) => entidad === Unidad)
      .map(([, filas]) => (filas as unknown[]).length);
    expect(tandas).toEqual([500, 500, 200]);
  });

  it('no debe insertar módulos ni espacios cuando no hay', async () => {
    await target.crear(99, dto({ modulos: [], espacios: undefined }));

    expect(insertado(RedModulo)).toBeUndefined();
    expect(insertado(EspacioComun)).toBeUndefined();
  });

  it('debe crear la cuenta del responsable sin contraseña y asignarle Presidente si no hay administración externa', async () => {
    await target.crear(99, dto());

    expect(mockManager.create).toHaveBeenCalledWith(Usuario, {
      pais: 'CL',
      identificador: '12345678-5',
      nombre: 'Ana',
      primerApellido: 'Soto',
      segundoApellido: null,
      correo: 'ana@correo.cl',
      telefono: null,
      passwordHash: null,
    });
    expect(insertado(Membresia)).toEqual({
      idUsuario: 50,
      idRed: 7,
      idRol: RolUsuario.PRESIDENTE,
      activo: true,
      desde: '2026-11-05',
      hasta: null,
    });
    expect(mockAuthService.emitirTokenPassword).toHaveBeenCalledWith(
      50,
      TipoTokenPassword.ACTIVACION,
      mockManager,
    );
  });

  it('debe asignar Administrador cuando se activa la administración externa', async () => {
    await target.crear(
      99,
      dto({ modulos: [CodigoModulo.ADMINISTRADOR_EXTERNO] }),
    );

    expect(insertado(Membresia)).toEqual(
      expect.objectContaining({ idRol: RolUsuario.ADMINISTRADOR }),
    );
  });

  it('debe registrar la creación en la bitácora de plataforma dentro de la transacción', async () => {
    await target.crear(99, dto());

    expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
      {
        ambito: AmbitoBitacora.PLATAFORMA,
        idRed: 7,
        idUsuario: 99,
        accion: 'crear_comunidad',
        entidad: 'redes_vecinales',
        idEntidad: 7,
        detalle: {
          nombre: 'Condominio Los Robles',
          tipo: TipoRedVecinal.CONDOMINIO,
          unidades: 3,
          modulos: [CodigoModulo.MURO, CodigoModulo.COBROS],
          espacios: ['Quincho'],
          responsable: {
            idUsuario: 50,
            cargo: 'Presidente',
            cuentaNueva: true,
          },
        },
      },
      mockManager,
    );
  });

  it('debe enviar el enlace de activación después de la transacción y devolver el resumen', async () => {
    const resultado = await target.crear(99, dto());

    expect(mockMailService.enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        para: 'ana@correo.cl',
        texto: expect.stringContaining(
          'http://panel/restablecer?token=token-123',
        ),
      }),
    );
    expect(resultado).toEqual({
      idRed: 7,
      nombre: 'Robles',
      correoEnviado: true,
    });
  });

  describe('cuando el RUT ya tiene cuenta', () => {
    it('debe reutilizarla sin cambiar sus datos y sin enlace si ya tiene contraseña', async () => {
      porIdentificador = cuentaExistente({ correo: 'ana.vieja@correo.cl' });
      porCorreo = null;
      mockManager.exists.mockResolvedValue(true);

      await target.crear(99, dto());

      expect(mockManager.save).not.toHaveBeenCalled();
      expect(insertado(Membresia)).toEqual(
        expect.objectContaining({ idUsuario: 40 }),
      );
      expect(mockAuthService.emitirTokenPassword).not.toHaveBeenCalled();
      expect(mockMailService.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          para: 'ana.vieja@correo.cl',
          texto: expect.stringContaining('selector de comunidades'),
        }),
      );
    });

    it('debe enviar enlace de activación si la cuenta aún no tiene contraseña', async () => {
      porIdentificador = cuentaExistente();
      porCorreo = porIdentificador;

      await target.crear(99, dto());

      expect(mockAuthService.emitirTokenPassword).toHaveBeenCalledWith(
        40,
        TipoTokenPassword.ACTIVACION,
        mockManager,
      );
    });

    it('debe restaurar la cuenta si estaba eliminada', async () => {
      porIdentificador = cuentaExistente({ fechaEliminacion: AHORA });
      porCorreo = porIdentificador;

      await target.crear(99, dto());

      expect(mockManager.restore).toHaveBeenCalledWith(Usuario, {
        idUsuario: 40,
      });
    });

    it.each([
      [
        'bloqueada',
        { bloqueado: true },
        'La cuenta del responsable está bloqueada. Desbloquéala antes de asignarle una comunidad.',
      ],
      [
        'del equipo EntreCasas',
        { esPlataforma: true },
        'Una cuenta del equipo EntreCasas no puede tener cargos ni viviendas en una comunidad',
      ],
    ])(
      'debe rechazar una cuenta %s sin crear nada más',
      async (_caso, cambios: Partial<Usuario>, mensaje: string) => {
        porIdentificador = cuentaExistente(cambios);
        porCorreo = porIdentificador;

        await expect(target.crear(99, dto())).rejects.toThrow(
          new ConflictException(mensaje),
        );

        expect(insertado(Membresia)).toBeUndefined();
        expect(mockMailService.enviar).not.toHaveBeenCalled();
      },
    );
  });

  it('debe rechazar un correo que ya pertenece a otra persona', async () => {
    porCorreo = cuentaExistente({ idUsuario: 41, identificador: '1-9' });

    await expect(target.crear(99, dto())).rejects.toThrow(
      new ConflictException(
        'El correo del responsable ya está registrado por otra persona',
      ),
    );

    expect(mockMailService.enviar).not.toHaveBeenCalled();
  });
});
