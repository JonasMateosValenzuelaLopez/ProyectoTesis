import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHmac } from 'node:crypto';
import {
  DataSource,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  Not,
  QueryFailedError,
} from 'typeorm';
import { CodigoError } from '../common/errores/codigo-error.enum';
import { MailService } from '../mail/mail.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { MENSAJE_CODIGO_INVALIDO } from './auth.constantes';
import { AuthService } from './auth.service';
import { MENSAJE_PASSWORD_ACTUAL_INCORRECTA } from './dto/mis-datos.dto';
import { CambioCorreo } from './entities/cambio-correo.entity';
import { CodigoOtp } from './entities/codigo-otp.entity';
import { TokenPassword } from './entities/token-password.entity';
import {
  MENSAJE_CODIGO_CORREO_ENVIADO,
  MENSAJE_CORREO_NO_DISPONIBLE,
  MENSAJE_CUENTA_SIN_PASSWORD,
  MENSAJE_PASSWORD_CAMBIO_EN_CURSO,
  MENSAJE_PASSWORD_REPETIDA,
  MisDatosService,
} from './mis-datos.service';

const AHORA = new Date('2026-11-06T15:00:00Z');
const SECRETO = 'secreto-de-prueba-de-32-caracteres!!';
const ID_ANA = 2;
const CORREO_ANTERIOR = 'ana@correo.cl';
const CORREO_NUEVO = 'ana.nueva@correo.cl';
const CODIGO = '123456';

const hash = (codigo: string, correo = CORREO_NUEVO, idUsuario = ID_ANA) =>
  createHmac('sha256', SECRETO)
    .update(`cambio-correo:${idUsuario}:${correo}:${codigo}`)
    .digest('hex');

const PASSWORD_ACTUAL = 'Clave1234';
const PASSWORD_NUEVA = 'Nueva5678';
const HASH_ACTUAL = bcrypt.hashSync(PASSWORD_ACTUAL, 4);

const PERFIL = { idUsuario: ID_ANA, nombre: 'Ana', correo: CORREO_NUEVO };

const crearCambio = (cambios: Partial<CambioCorreo> = {}) =>
  ({
    idCambio: 7,
    idUsuario: ID_ANA,
    correoNuevo: CORREO_NUEVO,
    codigoHash: hash(CODIGO),
    expira: new Date('2026-11-06T15:10:00Z'),
    intentos: 0,
    usado: false,
    confirmadoEn: null,
    ...cambios,
  }) as CambioCorreo;

const errorDuplicado = () =>
  new QueryFailedError(
    'UPDATE usuarios ...',
    [],
    Object.assign(new Error('ER_DUP_ENTRY: correo'), { code: 'ER_DUP_ENTRY' }),
  );

const SESION = {
  accessToken: 'jwt-nuevo',
  tokenType: 'Bearer',
  usuario: PERFIL,
};

interface CorreoEnviado {
  para: string;
  asunto: string;
  texto: string;
}

describe('MisDatosService', () => {
  let target: MisDatosService;
  let mockUsuariosRepository: {
    update: jest.Mock;
    exists: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockConsultaUsuario: {
    addSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let mockCambiosRepository: { findOne: jest.Mock; update: jest.Mock };
  let mockManager: {
    findOne: jest.Mock;
    count: jest.Mock;
    exists: jest.Mock;
    update: jest.Mock;
    insert: jest.Mock;
    softDelete: jest.Mock;
  };
  let mockTransaction: jest.Mock;
  let mockMail: { enviar: jest.Mock };
  let mockAuth: { perfil: jest.Mock; nuevaSesion: jest.Mock };
  let espiaWarn: jest.SpyInstance;
  let espiaError: jest.SpyInstance;

  const correosEnviados = () =>
    mockMail.enviar.mock.calls.map(([correo]) => correo as CorreoEnviado);

  const correoA = (para: string) =>
    correosEnviados().find((correo) => correo.para === para);

  const esperarCodigoInvalido = async (promesa: Promise<unknown>) => {
    const error = await promesa.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual(
      expect.objectContaining({
        message: MENSAJE_CODIGO_INVALIDO,
        campos: { codigo: MENSAJE_CODIGO_INVALIDO },
      }),
    );
  };

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    espiaWarn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    espiaError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    mockConsultaUsuario = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        idUsuario: ID_ANA,
        nombre: 'Ana',
        correo: CORREO_ANTERIOR,
        passwordHash: HASH_ACTUAL,
      }),
    };
    mockUsuariosRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      exists: jest.fn().mockResolvedValue(false),
      createQueryBuilder: jest.fn().mockReturnValue(mockConsultaUsuario),
    };
    mockCambiosRepository = {
      findOne: jest.fn().mockResolvedValue(crearCambio()),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockManager = {
      findOne: jest.fn().mockResolvedValue({
        idUsuario: ID_ANA,
        nombre: 'Ana',
        correo: CORREO_ANTERIOR,
      }),
      count: jest.fn().mockResolvedValue(0),
      exists: jest.fn().mockResolvedValue(false),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idCambio: 8 }] }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockTransaction = jest.fn((trabajo: (m: unknown) => unknown) =>
      trabajo(mockManager),
    );
    mockMail = { enviar: jest.fn().mockResolvedValue(true) };
    mockAuth = {
      perfil: jest.fn().mockResolvedValue(PERFIL),
      nuevaSesion: jest.fn().mockResolvedValue(SESION),
    };

    const module = await Test.createTestingModule({
      providers: [
        MisDatosService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockUsuariosRepository,
        },
        {
          provide: getRepositoryToken(CambioCorreo),
          useValue: mockCambiosRepository,
        },
        { provide: DataSource, useValue: { transaction: mockTransaction } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue(SECRETO) },
        },
        { provide: MailService, useValue: mockMail },
        { provide: AuthService, useValue: mockAuth },
      ],
    }).compile();

    target = module.get(MisDatosService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('actualizarTelefono', () => {
    it.each([['+56961234501'], [null]])(
      'debe guardar %p solo en la cuenta vigente y devolver el perfil',
      async (telefono) => {
        const resultado = await target.actualizarTelefono(ID_ANA, {
          telefono,
        });

        expect(mockUsuariosRepository.update).toHaveBeenCalledWith(
          { idUsuario: ID_ANA, fechaEliminacion: IsNull() },
          { telefono },
        );
        expect(resultado).toEqual(PERFIL);
      },
    );

    it('debe responder 404 si la cuenta no existe', async () => {
      mockUsuariosRepository.update.mockResolvedValue({ affected: 0 });

      await expect(
        target.actualizarTelefono(ID_ANA, { telefono: null }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('solicitarCambioCorreo', () => {
    it('debe anular lo pendiente, guardar el código hasheado y enviarlo solo al correo nuevo', async () => {
      const resultado = await target.solicitarCambioCorreo(ID_ANA, {
        correo: CORREO_NUEVO,
        passwordActual: PASSWORD_ACTUAL,
      });

      expect(mockManager.findOne).toHaveBeenCalledWith(Usuario, {
        where: { idUsuario: ID_ANA },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.count).toHaveBeenCalledWith(CambioCorreo, {
        where: {
          idUsuario: ID_ANA,
          fechaCreacion: MoreThan(new Date('2026-11-06T14:45:00Z')),
        },
        withDeleted: true,
      });
      expect(mockManager.exists).toHaveBeenCalledWith(Usuario, {
        where: { correo: CORREO_NUEVO, idUsuario: Not(ID_ANA) },
        withDeleted: true,
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        CambioCorreo,
        { idUsuario: ID_ANA, usado: false },
        { usado: true, correoNuevo: null },
      );
      const fila = mockManager.insert.mock.calls[0][1] as CambioCorreo;
      expect(fila).toEqual({
        idUsuario: ID_ANA,
        correoNuevo: CORREO_NUEVO,
        codigoHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        expira: new Date('2026-11-06T15:10:00Z'),
      });
      const [correo] = correosEnviados();
      const codigo = /\b(\d{6})\b/.exec(correo.texto)?.[1] as string;
      expect(correosEnviados()).toHaveLength(1);
      expect(correo.para).toBe(CORREO_NUEVO);
      expect(correo.asunto).not.toMatch(/\d{6}/);
      expect(fila.codigoHash).toBe(hash(codigo));
      expect(resultado).toEqual({
        mensaje: MENSAJE_CODIGO_CORREO_ENVIADO,
        expiraEn: new Date('2026-11-06T15:10:00Z'),
      });
    });

    it('con un correo de otra cuenta debe responder lo mismo sin enviar ni guardar la dirección', async () => {
      mockManager.exists.mockResolvedValue(true);

      const resultado = await target.solicitarCambioCorreo(ID_ANA, {
        correo: 'luis@correo.cl',
        passwordActual: PASSWORD_ACTUAL,
      });

      expect(mockManager.insert).toHaveBeenCalledWith(CambioCorreo, {
        idUsuario: ID_ANA,
        correoNuevo: null,
        codigoHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        expira: new Date('2026-11-06T15:10:00Z'),
        usado: true,
      });
      expect(mockMail.enviar).not.toHaveBeenCalled();
      expect(espiaWarn).toHaveBeenCalledWith(
        `El usuario ${ID_ANA} pidió cambiar su correo a uno ya registrado; no se envió código`,
      );
      expect(espiaWarn.mock.calls[0][0]).not.toContain('luis@correo.cl');
      expect(resultado).toEqual({
        mensaje: MENSAJE_CODIGO_CORREO_ENVIADO,
        expiraEn: new Date('2026-11-06T15:10:00Z'),
      });
    });

    it.each([['ana@correo.cl'], ['Ana@Correo.CL']])(
      'debe rechazar el mismo correo de la cuenta aunque esté guardado como %s',
      async (guardado) => {
        mockManager.findOne.mockResolvedValue({
          idUsuario: ID_ANA,
          nombre: 'Ana',
          correo: guardado,
        });

        await expect(
          target.solicitarCambioCorreo(ID_ANA, {
            correo: 'ana@correo.cl',
            passwordActual: PASSWORD_ACTUAL,
          }),
        ).rejects.toThrow(BadRequestException);
        expect(mockManager.insert).not.toHaveBeenCalled();
      },
    );

    it('debe limitar a 3 pedidos cada 15 minutos sin tocar el pedido vigente', async () => {
      mockManager.count.mockResolvedValue(3);

      const error = await target
        .solicitarCambioCorreo(ID_ANA, {
          correo: CORREO_NUEVO,
          passwordActual: PASSWORD_ACTUAL,
        })
        .catch((e: HttpException) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({
          codigo: CodigoError.DEMASIADAS_SOLICITUDES,
        }),
      );
      expect(mockManager.exists).not.toHaveBeenCalled();
      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockMail.enviar).not.toHaveBeenCalled();
    });

    it('debe permitir el tercer pedido de la ventana', async () => {
      mockManager.count.mockResolvedValue(2);

      await target.solicitarCambioCorreo(ID_ANA, {
        correo: CORREO_NUEVO,
        passwordActual: PASSWORD_ACTUAL,
      });

      expect(mockManager.insert).toHaveBeenCalledTimes(1);
      expect(mockMail.enviar).toHaveBeenCalledTimes(1);
    });

    it('debe responder 404 si la cuenta no existe', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        target.solicitarCambioCorreo(ID_ANA, {
          correo: CORREO_NUEVO,
          passwordActual: PASSWORD_ACTUAL,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('si el correo no sale debe dejarlo en el log sin cambiar la respuesta', async () => {
      mockMail.enviar.mockResolvedValue(false);

      const resultado = await target.solicitarCambioCorreo(ID_ANA, {
        correo: CORREO_NUEVO,
        passwordActual: PASSWORD_ACTUAL,
      });
      await jest.runAllTimersAsync();

      expect(espiaError).toHaveBeenCalledWith(
        `No se entregó el correo "Confirma tu nuevo correo en EntreCasas" del usuario ${ID_ANA}`,
      );
      expect(resultado.mensaje).toBe(MENSAJE_CODIGO_CORREO_ENVIADO);
    });

    it('si el envío lanza un error debe registrarlo sin dejar la promesa sin manejar', async () => {
      mockMail.enviar.mockRejectedValue(new Error('SMTP caído'));

      await target.solicitarCambioCorreo(ID_ANA, {
        correo: CORREO_NUEVO,
        passwordActual: PASSWORD_ACTUAL,
      });
      await jest.runAllTimersAsync();

      expect(espiaError).toHaveBeenCalledWith(
        `Falló el envío del correo "Confirma tu nuevo correo en EntreCasas" del usuario ${ID_ANA}`,
        expect.stringContaining('SMTP caído'),
      );
    });

    it('debe rechazar el pedido sin enviar código si la contraseña actual es incorrecta', async () => {
      const error = await target
        .solicitarCambioCorreo(ID_ANA, {
          correo: CORREO_NUEVO,
          passwordActual: 'otra-clave-123',
        })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual(
        expect.objectContaining({
          campos: { passwordActual: MENSAJE_PASSWORD_ACTUAL_INCORRECTA },
        }),
      );
      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockMail.enviar).not.toHaveBeenCalled();
    });

    it('debe pedir crear una contraseña antes de cambiar el correo si la cuenta no tiene', async () => {
      mockConsultaUsuario.getOne.mockResolvedValue({
        idUsuario: ID_ANA,
        correo: CORREO_ANTERIOR,
        passwordHash: null,
      });

      const error = await target
        .solicitarCambioCorreo(ID_ANA, {
          correo: CORREO_NUEVO,
          passwordActual: PASSWORD_ACTUAL,
        })
        .catch((e: unknown) => e);

      expect((error as BadRequestException).getResponse()).toEqual(
        expect.objectContaining({
          campos: { passwordActual: MENSAJE_CUENTA_SIN_PASSWORD },
        }),
      );
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('confirmarCambioCorreo', () => {
    it('debe cambiar el correo, anular códigos y enlaces del correo anterior y avisar a ambos', async () => {
      const resultado = await target.confirmarCambioCorreo(ID_ANA, {
        codigo: CODIGO,
      });

      expect(mockCambiosRepository.findOne).toHaveBeenCalledWith({
        where: { idUsuario: ID_ANA, usado: false, expira: MoreThan(AHORA) },
        order: { idCambio: 'DESC' },
      });
      expect(mockCambiosRepository.update).toHaveBeenCalledWith(
        { idCambio: 7, usado: false, intentos: LessThan(5) },
        { intentos: expect.any(Function) },
      );
      const descuento = mockCambiosRepository.update.mock.calls[0][1] as {
        intentos: () => string;
      };
      expect(descuento.intentos()).toBe('intentos + 1');
      expect(mockUsuariosRepository.exists).toHaveBeenCalledWith({
        where: { correo: CORREO_NUEVO, idUsuario: Not(ID_ANA) },
        withDeleted: true,
      });
      expect(mockManager.findOne).toHaveBeenCalledWith(Usuario, {
        where: { idUsuario: ID_ANA },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        CambioCorreo,
        { idCambio: 7, usado: false },
        { usado: true, confirmadoEn: AHORA, correoNuevo: null },
      );
      expect(mockManager.update).toHaveBeenCalledWith(
        Usuario,
        { idUsuario: ID_ANA },
        { correo: CORREO_NUEVO },
      );
      expect(mockManager.update).toHaveBeenCalledWith(
        CodigoOtp,
        { idUsuario: ID_ANA, usado: false },
        { usado: true },
      );
      expect(mockManager.update).toHaveBeenCalledWith(
        TokenPassword,
        { idUsuario: ID_ANA, fechaUso: IsNull() },
        { fechaUso: AHORA },
      );
      const aviso = correoA(CORREO_ANTERIOR);
      expect(aviso?.texto).toContain('Hola Ana');
      expect(aviso?.texto).toContain('a***a@correo.cl');
      expect(aviso?.texto).not.toContain(CORREO_NUEVO);
      expect(correoA(CORREO_NUEVO)).toBeDefined();
      expect(resultado).toEqual(PERFIL);
    });

    it('debe enviar el aviso al correo anterior aunque falle la lectura del perfil', async () => {
      mockAuth.perfil.mockRejectedValue(new Error('sin conexión'));

      await expect(
        target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO }),
      ).rejects.toThrow('sin conexión');

      expect(correoA(CORREO_ANTERIOR)).toBeDefined();
      expect(correoA(CORREO_NUEVO)).toBeDefined();
    });

    it('debe dejar en el log si el aviso al correo anterior no salió', async () => {
      mockMail.enviar.mockResolvedValue(false);

      await target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO });
      await jest.runAllTimersAsync();

      expect(espiaError).toHaveBeenCalledWith(
        `No se entregó el correo "El correo de tu cuenta EntreCasas cambió" del usuario ${ID_ANA}`,
      );
    });

    it('debe responder 400 (no 401) si no hay un código vigente', async () => {
      mockCambiosRepository.findOne.mockResolvedValue(null);

      await esperarCodigoInvalido(
        target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO }),
      );
    });

    it('no debe confirmar un pedido sin dirección (anulado o de un correo ocupado)', async () => {
      mockCambiosRepository.findOne.mockResolvedValue(
        crearCambio({ correoNuevo: null }),
      );

      await esperarCodigoInvalido(
        target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO }),
      );
      expect(mockCambiosRepository.update).not.toHaveBeenCalled();
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('debe responder 400 con un código equivocado sin cambiar nada ni anular el pedido', async () => {
      await esperarCodigoInvalido(
        target.confirmarCambioCorreo(ID_ANA, { codigo: '654321' }),
      );
      expect(mockCambiosRepository.update).toHaveBeenCalledTimes(1);
      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockMail.enviar).not.toHaveBeenCalled();
    });

    it('debe anular el pedido y borrar la dirección al fallar el último intento', async () => {
      mockCambiosRepository.findOne.mockResolvedValue(
        crearCambio({ intentos: 4 }),
      );

      await esperarCodigoInvalido(
        target.confirmarCambioCorreo(ID_ANA, { codigo: '654321' }),
      );
      expect(mockCambiosRepository.update).toHaveBeenLastCalledWith(
        { idCambio: 7 },
        { usado: true, correoNuevo: null },
      );
    });

    it('debe anular el pedido si ya no quedaban intentos', async () => {
      mockCambiosRepository.update
        .mockResolvedValueOnce({ affected: 0 })
        .mockResolvedValueOnce({ affected: 1 });

      await esperarCodigoInvalido(
        target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO }),
      );
      expect(mockCambiosRepository.update).toHaveBeenLastCalledWith(
        { idCambio: 7 },
        { usado: true, correoNuevo: null },
      );
    });

    it('debe responder 400 y no lanzar si el hash guardado está corrupto', async () => {
      mockCambiosRepository.findOne.mockResolvedValue(
        crearCambio({ codigoHash: 'abc' }),
      );

      await esperarCodigoInvalido(
        target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO }),
      );
    });

    it('con un código equivocado debe responder 400 aunque el correo esté ocupado, sin revelarlo', async () => {
      mockUsuariosRepository.exists.mockResolvedValue(true);

      await esperarCodigoInvalido(
        target.confirmarCambioCorreo(ID_ANA, { codigo: '654321' }),
      );
      expect(mockUsuariosRepository.exists).not.toHaveBeenCalled();
    });

    it('debe responder 409 y anular el pedido si otra cuenta tomó el correo antes', async () => {
      mockUsuariosRepository.exists.mockResolvedValue(true);

      await expect(
        target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO }),
      ).rejects.toThrow(new ConflictException(MENSAJE_CORREO_NO_DISPONIBLE));
      expect(mockCambiosRepository.update).toHaveBeenLastCalledWith(
        { idCambio: 7 },
        { usado: true, correoNuevo: null },
      );
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('debe responder el mismo 409 y anular el pedido si otra cuenta toma el correo durante la transacción', async () => {
      mockManager.update.mockImplementation((entidad: unknown) =>
        entidad === Usuario
          ? Promise.reject(errorDuplicado())
          : Promise.resolve({ affected: 1 }),
      );

      await expect(
        target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO }),
      ).rejects.toThrow(new ConflictException(MENSAJE_CORREO_NO_DISPONIBLE));
      expect(mockCambiosRepository.update).toHaveBeenLastCalledWith(
        { idCambio: 7 },
        { usado: true, correoNuevo: null },
      );
      expect(mockMail.enviar).not.toHaveBeenCalled();
    });

    it('debe propagar otros errores de la transacción sin anular el pedido', async () => {
      mockManager.update.mockRejectedValue(new Error('sin conexión'));

      await expect(
        target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO }),
      ).rejects.toThrow('sin conexión');
      expect(mockCambiosRepository.update).toHaveBeenCalledTimes(1);
      expect(mockMail.enviar).not.toHaveBeenCalled();
    });

    it('debe responder 400 si el código se consumió en paralelo', async () => {
      mockManager.update.mockResolvedValueOnce({ affected: 0 });

      await esperarCodigoInvalido(
        target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO }),
      );
      expect(mockManager.update).toHaveBeenCalledTimes(1);
      expect(mockMail.enviar).not.toHaveBeenCalled();
    });

    it('debe responder 404 si la cuenta ya no existe', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO }),
      ).rejects.toThrow(NotFoundException);
    });

    it.each([
      ['otro correo', hash(CODIGO, 'otro@correo.cl')],
      ['otra cuenta', hash(CODIGO, CORREO_NUEVO, 3)],
    ])(
      'no debe aceptar el código emitido para %s',
      async (_caso, codigoHash) => {
        mockCambiosRepository.findOne.mockResolvedValue(
          crearCambio({ codigoHash }),
        );

        await esperarCodigoInvalido(
          target.confirmarCambioCorreo(ID_ANA, { codigo: CODIGO }),
        );
      },
    );
  });

  describe('cambiarPassword', () => {
    const cambiar = (
      passwordActual = PASSWORD_ACTUAL,
      passwordNueva = PASSWORD_NUEVA,
    ) => target.cambiarPassword(ID_ANA, { passwordActual, passwordNueva });

    const esperar400 = async (
      promesa: Promise<unknown>,
      campo: string,
      mensaje: string,
    ) => {
      const error = await promesa.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual(
        expect.objectContaining({
          message: mensaje,
          campos: { [campo]: mensaje },
        }),
      );
      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockMail.enviar).not.toHaveBeenCalled();
    };

    it('debe guardar la nueva contraseña, cerrar las otras sesiones, anular los enlaces y devolver una sesión nueva', async () => {
      const resultado = await cambiar();

      expect(mockConsultaUsuario.addSelect).toHaveBeenCalledWith(
        'usuario.passwordHash',
      );
      const [, condicion, cambios] = mockManager.update.mock.calls[0] as [
        unknown,
        Record<string, unknown>,
        { passwordHash: string; passwordActualizadaEn: Date },
      ];
      expect(condicion).toEqual({
        idUsuario: ID_ANA,
        passwordHash: HASH_ACTUAL,
        fechaEliminacion: IsNull(),
      });
      expect(await bcrypt.compare(PASSWORD_NUEVA, cambios.passwordHash)).toBe(
        true,
      );
      expect(cambios.passwordActualizadaEn).toEqual(AHORA);
      expect(mockManager.softDelete).toHaveBeenCalledWith(TokenPassword, {
        idUsuario: ID_ANA,
        fechaUso: IsNull(),
      });
      expect(mockAuth.nuevaSesion).toHaveBeenCalledWith(ID_ANA);
      expect(resultado).toBe(SESION);
    });

    it('debe fijar el cambio al segundo para que la sesión nueva no quede invalidada', async () => {
      jest.setSystemTime(new Date('2026-11-06T15:00:00.987Z'));

      await cambiar();

      const [, , cambios] = mockManager.update.mock.calls[0] as [
        unknown,
        unknown,
        { passwordActualizadaEn: Date },
      ];
      expect(cambios.passwordActualizadaEn).toEqual(AHORA);
    });

    it('debe avisar al correo de la cuenta sin incluir la contraseña', async () => {
      await cambiar();
      await Promise.resolve();

      const aviso = correoA(CORREO_ANTERIOR);
      expect(aviso?.asunto).toBe('Tu contraseña de EntreCasas cambió');
      expect(aviso?.texto).toContain(
        'cerramos la sesión en tus otros dispositivos',
      );
      expect(aviso?.texto).not.toContain(PASSWORD_NUEVA);
      expect(correosEnviados()).toHaveLength(1);
    });

    it('debe responder 400 (no 401) si la contraseña actual no es correcta', async () => {
      await esperar400(
        cambiar('Otra1234'),
        'passwordActual',
        MENSAJE_PASSWORD_ACTUAL_INCORRECTA,
      );
      expect(espiaWarn).toHaveBeenCalledWith(
        expect.stringContaining(`usuario ${ID_ANA}`),
      );
    });

    it('debe rechazar una contraseña nueva igual a la actual', async () => {
      await esperar400(
        cambiar(PASSWORD_ACTUAL, PASSWORD_ACTUAL),
        'passwordNueva',
        MENSAJE_PASSWORD_REPETIDA,
      );
    });

    it('debe derivar a la recuperación por correo si la cuenta no tiene contraseña', async () => {
      mockConsultaUsuario.getOne.mockResolvedValue({
        idUsuario: ID_ANA,
        correo: CORREO_ANTERIOR,
        passwordHash: null,
      });

      await esperar400(
        cambiar(),
        'passwordActual',
        MENSAJE_CUENTA_SIN_PASSWORD,
      );
    });

    it('debe responder 404 si la cuenta no existe', async () => {
      mockConsultaUsuario.getOne.mockResolvedValue(null);

      await expect(cambiar()).rejects.toBeInstanceOf(NotFoundException);
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('debe responder 409 sin avisar ni emitir sesión si la contraseña cambió en paralelo', async () => {
      mockManager.update.mockResolvedValue({ affected: 0 });

      await expect(cambiar()).rejects.toEqual(
        new ConflictException(MENSAJE_PASSWORD_CAMBIO_EN_CURSO),
      );
      expect(mockManager.softDelete).not.toHaveBeenCalled();
      expect(mockMail.enviar).not.toHaveBeenCalled();
      expect(mockAuth.nuevaSesion).not.toHaveBeenCalled();
    });
  });

  describe('anularVencidos', () => {
    it('debe anular los pedidos vencidos y borrar su dirección', async () => {
      mockCambiosRepository.update.mockResolvedValue({ affected: 4 });

      const resultado = await target.anularVencidos();

      expect(mockCambiosRepository.update).toHaveBeenCalledWith(
        { usado: false, expira: LessThanOrEqual(AHORA) },
        { usado: true, correoNuevo: null },
      );
      expect(resultado).toBe(4);
    });

    it('debe devolver 0 si el driver no informa filas', async () => {
      mockCambiosRepository.update.mockResolvedValue({});

      await expect(target.anularVencidos()).resolves.toBe(0);
    });
  });
});
