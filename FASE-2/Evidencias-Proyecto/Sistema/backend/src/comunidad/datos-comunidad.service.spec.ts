import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, In, Not } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { CorreosComunidadService } from '../mail/correos-comunidad.service';
import { CorreoSaliente } from '../mail/mail.service';
import {
  EstadoRedVecinal,
  RedVecinal,
  TipoRedVecinal,
} from '../redes-vecinales/entities/red-vecinal.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  DatosComunidadService,
  enmascararCuenta,
  MENSAJE_CUENTA_INCOMPLETA,
} from './datos-comunidad.service';
import { GuardarDatosComunidadDto } from './dto/datos-comunidad.dto';

const ID_ADMIN = 7;

const RED: ContextoRed = {
  idRed: 3,
  roles: [RolUsuario.ADMINISTRADOR],
  modulos: [],
  idsUnidades: [],
};

const CUENTA = {
  banco: 'Banco Estado',
  tipoCuenta: 'Cuenta corriente',
  numeroCuenta: '62900145872',
  titularCuenta: 'Comunidad Las Palmas',
  identificadorTitular: '65142380-5',
  correoTransferencias: 'pagos@laspalmas.cl',
} as const;

const SIN_CUENTA = {
  banco: null,
  tipoCuenta: null,
  numeroCuenta: null,
  titularCuenta: null,
  identificadorTitular: null,
  correoTransferencias: null,
};

const crearComunidad = (cambios: Partial<RedVecinal> = {}) =>
  ({
    idRed: 3,
    nombre: 'Las Palmas',
    tipo: TipoRedVecinal.CONDOMINIO,
    direccion: 'Av. Los Pinos 123',
    estado: EstadoRedVecinal.ACTIVA,
    ...CUENTA,
    umbralVisado: 100000,
    ...cambios,
  }) as RedVecinal;

const serializada = (comunidad: RedVecinal) => ({
  idRed: comunidad.idRed,
  nombre: comunidad.nombre,
  tipo: comunidad.tipo,
  direccion: comunidad.direccion,
  banco: comunidad.banco,
  tipoCuenta: comunidad.tipoCuenta,
  numeroCuenta: comunidad.numeroCuenta,
  titularCuenta: comunidad.titularCuenta,
  identificadorTitular: comunidad.identificadorTitular,
  correoTransferencias: comunidad.correoTransferencias,
  umbralVisado: comunidad.umbralVisado,
});

const crearMembresia = (
  idUsuario: number,
  idRol: RolUsuario,
  usuario: Partial<Usuario> = {},
) =>
  ({
    idUsuario,
    idRol,
    usuario: {
      idUsuario,
      nombre: `Persona ${idUsuario}`,
      correo: `persona${idUsuario}@correo.cl`,
      bloqueado: false,
      ...usuario,
    },
  }) as Membresia;

const dtoDe = (cambios: Partial<GuardarDatosComunidadDto> = {}) =>
  ({
    nombre: 'Las Palmas',
    direccion: 'Av. Los Pinos 123',
    ...CUENTA,
    ...cambios,
  }) as GuardarDatosComunidadDto;

describe('DatosComunidadService', () => {
  let target: DatosComunidadService;
  let comunidadEnBd: RedVecinal | null;
  let mockManager: { findOne: jest.Mock; find: jest.Mock; update: jest.Mock };
  let mockDataSource: { transaction: jest.Mock; manager: typeof mockManager };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let mockCorreosService: { enviarEnSegundoPlano: jest.Mock };

  const avisosEnviados = () =>
    mockCorreosService.enviarEnSegundoPlano.mock.calls.flatMap(
      ([correos]) => correos as CorreoSaliente[],
    );

  beforeEach(async () => {
    comunidadEnBd = crearComunidad();
    mockManager = {
      findOne: jest.fn((entidad: unknown) =>
        Promise.resolve(
          entidad === Usuario
            ? { idUsuario: ID_ADMIN, nombre: 'Carla' }
            : comunidadEnBd && { ...comunidadEnBd },
        ),
      ),
      find: jest
        .fn()
        .mockResolvedValue([
          crearMembresia(4, RolUsuario.PRESIDENTE),
          crearMembresia(5, RolUsuario.TESORERO),
        ]),
      update: jest.fn((_entidad: unknown, _donde: unknown, cambios: object) => {
        comunidadEnBd = { ...comunidadEnBd, ...cambios } as RedVecinal;
        return Promise.resolve({ affected: 1 });
      }),
    };
    mockDataSource = {
      transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
        trabajo(mockManager),
      ),
      manager: mockManager,
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };
    mockCorreosService = { enviarEnSegundoPlano: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        DatosComunidadService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: BitacoraService, useValue: mockBitacoraService },
        { provide: CorreosComunidadService, useValue: mockCorreosService },
      ],
    }).compile();

    target = module.get(DatosComunidadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('obtener', () => {
    it('debe devolver los datos de la comunidad del contexto', async () => {
      const resultado = await target.obtener(RED);

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: 3 },
      });
      expect(resultado).toEqual(serializada(crearComunidad()));
    });

    it('debe responder 404 si la comunidad no existe', async () => {
      comunidadEnBd = null;

      await expect(target.obtener(RED)).rejects.toThrow(
        new NotFoundException('Comunidad no encontrada'),
      );
    });
  });

  describe('guardar', () => {
    it('debe actualizar solo la comunidad del contexto, con bloqueo, y registrar los campos cambiados', async () => {
      const resultado = await target.guardar(
        RED,
        ID_ADMIN,
        dtoDe({ nombre: 'Condominio Las Palmas' }),
      );

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        RedVecinal,
        { idRed: 3 },
        {
          nombre: 'Condominio Las Palmas',
          direccion: 'Av. Los Pinos 123',
          ...CUENTA,
        },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: ID_ADMIN,
          accion: 'actualizar_datos_comunidad',
          entidad: 'redes_vecinales',
          idEntidad: 3,
          detalle: { campos: ['nombre'] },
        },
        mockManager,
      );
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
      expect(mockCorreosService.enviarEnSegundoPlano).not.toHaveBeenCalled();
      expect(resultado).toEqual(
        serializada(crearComunidad({ nombre: 'Condominio Las Palmas' })),
      );
    });

    it('no debe escribir ni registrar nada si no cambió ningún dato', async () => {
      const resultado = await target.guardar(RED, ID_ADMIN, dtoDe());

      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
      expect(resultado).toEqual(serializada(crearComunidad()));
    });

    it('debe guardar en null los datos de cuenta que no se envían', async () => {
      await target.guardar(RED, ID_ADMIN, {
        nombre: 'Las Palmas',
        direccion: 'Av. Los Pinos 123',
      });

      expect(mockManager.update).toHaveBeenCalledWith(
        RedVecinal,
        { idRed: 3 },
        { nombre: 'Las Palmas', direccion: 'Av. Los Pinos 123', ...SIN_CUENTA },
      );
    });

    it('al cambiar la cuenta debe registrarla enmascarada y avisar a la directiva menos a quien la cambió', async () => {
      mockManager.find.mockResolvedValue([
        crearMembresia(4, RolUsuario.PRESIDENTE),
        crearMembresia(4, RolUsuario.RESIDENTE),
        crearMembresia(5, RolUsuario.TESORERO),
        crearMembresia(6, RolUsuario.TESORERO, { bloqueado: true }),
      ]);

      await target.guardar(
        RED,
        ID_ADMIN,
        dtoDe({ numeroCuenta: '00-158-74123-09' }),
      );

      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          detalle: {
            campos: ['numeroCuenta'],
            cuentaAnterior: 'terminada en 5872',
            cuentaNueva: 'terminada en 2309',
          },
        }),
        mockManager,
      );
      expect(mockManager.find).toHaveBeenCalledWith(Membresia, {
        where: expect.objectContaining({
          idRed: 3,
          idUsuario: Not(ID_ADMIN),
          idRol: In([
            RolUsuario.ADMINISTRADOR,
            RolUsuario.PRESIDENTE,
            RolUsuario.TESORERO,
          ]),
          activo: true,
        }) as object,
        relations: { usuario: true },
      });
      expect(avisosEnviados().map((correo) => correo.para)).toEqual([
        'persona4@correo.cl',
        'persona5@correo.cl',
      ]);
    });

    it('el aviso debe decir quién cambió la cuenta y mostrarla enmascarada', async () => {
      await target.guardar(
        RED,
        ID_ADMIN,
        dtoDe({ numeroCuenta: '00-158-74123-09' }),
      );

      const [aviso] = avisosEnviados();
      expect(aviso.asunto).toBe(
        'Cambiaron los datos para transferencias de Las Palmas',
      );
      expect(aviso.texto).toContain('Carla cambió los datos de la cuenta');
      expect(aviso.texto).toContain(
        'Ahora: Banco Estado, Cuenta corriente, terminada en 2309, a nombre de Comunidad Las Palmas',
      );
      expect(aviso.texto).toContain(
        'Antes: Banco Estado, Cuenta corriente, terminada en 5872',
      );
      expect(aviso.texto).not.toContain('62900145872');
      expect(aviso.texto).not.toContain('74123');
    });

    it('debe avisar también cuando se quita la cuenta', async () => {
      await target.guardar(RED, ID_ADMIN, {
        nombre: 'Las Palmas',
        direccion: 'Av. Los Pinos 123',
      });

      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          detalle: {
            campos: [
              'banco',
              'tipoCuenta',
              'numeroCuenta',
              'titularCuenta',
              'identificadorTitular',
              'correoTransferencias',
            ],
            cuentaAnterior: 'terminada en 5872',
            cuentaNueva: null,
          },
        }),
        mockManager,
      );
      expect(avisosEnviados()[0].texto).toContain(
        'Ahora: sin cuenta para transferencias',
      );
    });

    it('debe avisar si solo cambió el correo para comprobantes', async () => {
      await target.guardar(
        RED,
        ID_ADMIN,
        dtoDe({ correoTransferencias: 'otro@correo.cl' }),
      );

      expect(avisosEnviados()).toHaveLength(2);
    });

    it('no debe enviar nada si no hay a quién avisar', async () => {
      mockManager.find.mockResolvedValue([]);

      await target.guardar(RED, ID_ADMIN, dtoDe({ banco: 'Banco de Chile' }));

      expect(mockCorreosService.enviarEnSegundoPlano).not.toHaveBeenCalled();
    });

    it.each([
      [
        'falta el número',
        { numeroCuenta: undefined },
        { numeroCuenta: 'Indica el número de cuenta' },
      ],
      [
        'solo viene el correo',
        { ...SIN_CUENTA, correoTransferencias: 'pagos@laspalmas.cl' },
        {
          banco: 'Indica el banco',
          tipoCuenta: 'Indica el tipo de cuenta',
          numeroCuenta: 'Indica el número de cuenta',
          titularCuenta: 'Indica el titular de la cuenta',
          identificadorTitular: 'Indica el RUT del titular',
        },
      ],
      [
        'falta el RUT del titular',
        { identificadorTitular: null },
        { identificadorTitular: 'Indica el RUT del titular' },
      ],
    ])(
      'debe rechazar una cuenta incompleta cuando %s, sin abrir la transacción',
      async (_caso, cambios, campos) => {
        const error = await target
          .guardar(RED, ID_ADMIN, dtoDe(cambios))
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toEqual(
          expect.objectContaining({
            message: MENSAJE_CUENTA_INCOMPLETA,
            campos,
          }),
        );
        expect(mockDataSource.transaction).not.toHaveBeenCalled();
      },
    );

    it('debe aceptar la cuenta sin correo para comprobantes', async () => {
      await target.guardar(
        RED,
        ID_ADMIN,
        dtoDe({ correoTransferencias: undefined }),
      );

      expect(mockManager.update).toHaveBeenCalledWith(
        RedVecinal,
        { idRed: 3 },
        expect.objectContaining({ correoTransferencias: null }),
      );
    });

    it('debe responder 404 si la comunidad no existe', async () => {
      comunidadEnBd = null;

      await expect(target.guardar(RED, ID_ADMIN, dtoDe())).rejects.toThrow(
        NotFoundException,
      );
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
    });
  });

  describe('cambiarUmbralVisado', () => {
    it('debe cambiar el umbral de la comunidad del contexto y registrar el anterior y el nuevo', async () => {
      const resultado = await target.cambiarUmbralVisado(RED, 4, {
        umbralVisado: 300000,
      });

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        RedVecinal,
        { idRed: 3 },
        { umbralVisado: 300000 },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: 4,
          accion: 'cambiar_umbral_visado',
          entidad: 'redes_vecinales',
          idEntidad: 3,
          detalle: { anterior: 100000, nuevo: 300000 },
        },
        mockManager,
      );
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
      expect(resultado.umbralVisado).toBe(300000);
    });

    it('no debe escribir ni registrar nada si el umbral es el mismo', async () => {
      await target.cambiarUmbralVisado(RED, 4, { umbralVisado: 100000 });

      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
    });

    it('debe responder 404 si la comunidad no existe', async () => {
      comunidadEnBd = null;

      await expect(
        target.cambiarUmbralVisado(RED, 4, { umbralVisado: 300000 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('enmascararCuenta', () => {
    it.each([
      ['62900145872', 'terminada en 5872'],
      ['00-158-74123-09', 'terminada en 2309'],
      [null, null],
    ])('debe mostrar %p como %p', (numero, esperado) => {
      expect(enmascararCuenta(numero)).toBe(esperado);
    });
  });
});
