import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MODULO_KEY } from '../auth/decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { mensajesDeValidacion } from '../common/utils/validacion';
import {
  CancelarReservaDto,
  CrearReservaDto,
  DisponibilidadDto,
  GuardarEspaciosDto,
  RecibirEspacioDto,
} from './dto/reservas.dto';
import { EspaciosController } from './espacios.controller';
import { ReservasController } from './reservas.controller';

const reflector = new Reflector();
const metodo = (nombre: keyof ReservasController) =>
  ReservasController.prototype[nombre];

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

describe('ReservasController', () => {
  it('debe exigir sesión, comunidad y el módulo de reservas', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ReservasController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(reflector.get(MODULO_KEY, ReservasController)).toBe(
      CodigoModulo.RESERVAS,
    );
  });

  it.each([
    ['disponibilidad'],
    ['mias'],
    ['crear'],
    ['cancelarPropia'],
  ] as const)('debe dejar %s a cualquier persona de la comunidad', (nombre) => {
    expect(reflector.get(ROLES_KEY, metodo(nombre))).toBeUndefined();
  });

  it.each([['listar'], ['cancelarPorAdministracion']] as const)(
    'debe dejar %s solo a la Administración',
    (nombre) => {
      expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual([
        RolUsuario.ADMINISTRADOR,
      ]);
    },
  );

  it.each([['delDia'], ['entregar'], ['recibir']] as const)(
    'debe dejar %s solo a la Conserjería',
    (nombre) => {
      expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual([
        RolUsuario.CONSERJE,
      ]);
    },
  );

  it('debe limitar las reservas a 10 por minuto', () => {
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', metodo('crear'))).toBe(
      10,
    );
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo('crear'))).toBe(
      60_000,
    );
  });
});

describe('EspaciosController', () => {
  const metodoEspacios = (nombre: keyof EspaciosController) =>
    EspaciosController.prototype[nombre];

  it('debe exigir sesión y comunidad, sin exigir el módulo de reservas', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, EspaciosController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(reflector.get(MODULO_KEY, EspaciosController)).toBeUndefined();
  });

  it('debe dejar ver los espacios a toda la comunidad y editarlos solo a la Administración', () => {
    expect(reflector.get(ROLES_KEY, metodoEspacios('listar'))).toBeUndefined();
    expect(reflector.get(ROLES_KEY, metodoEspacios('guardar'))).toEqual([
      RolUsuario.ADMINISTRADOR,
    ]);
  });
});

describe('DTO de reservas', () => {
  it('debe recortar el nombre y aceptar espacios con horarios', async () => {
    const { dto, mensajes } = await validar(GuardarEspaciosDto, {
      espacios: [
        {
          nombre: '  Quincho ',
          capacidad: 20,
          bloques: [{ horaInicio: '12:00', horaFin: '17:00' }],
        },
      ],
    });

    expect(mensajes).toEqual([]);
    expect(dto.espacios[0].nombre).toBe('Quincho');
  });

  it.each([
    [
      { espacios: [{ nombre: '', bloques: [] }] },
      'El nombre del espacio es obligatorio',
    ],
    [
      { espacios: [{ nombre: 'Sala', capacidad: 0, bloques: [] }] },
      'La capacidad debe ser un número entero entre 1 y 1000',
    ],
    [
      {
        espacios: [
          {
            nombre: 'Sala',
            bloques: [{ horaInicio: '24:00', horaFin: '25:00' }],
          },
        ],
      },
      'La hora debe tener el formato HH:MM',
    ],
    [{ espacios: 'Quincho' }, 'Los espacios comunes deben ser una lista'],
  ])('con %j debe responder «%s»', async (datos, mensaje) => {
    const { mensajes } = await validar(GuardarEspaciosDto, datos);

    expect(mensajes).toContain(mensaje);
  });

  it('debe convertir la consulta de disponibilidad que llega como texto', async () => {
    const { dto, mensajes } = await validar(DisponibilidadDto, {
      idEspacio: '4',
      fecha: '2026-11-06',
    });

    expect(mensajes).toEqual([]);
    expect(dto).toEqual({ idEspacio: 4, fecha: '2026-11-06' });
  });

  it.each([
    [
      { idEspacio: 1, idUnidad: 2, fecha: '2026-11-31', horaInicio: '12:00' },
      'La fecha debe tener el formato AAAA-MM-DD y existir',
    ],
    [
      { idEspacio: 1, idUnidad: 2, fecha: '2026-11-06', horaInicio: '12' },
      'Elige un horario',
    ],
    [
      { idEspacio: 1, fecha: '2026-11-06', horaInicio: '12:00' },
      'Elige tu vivienda',
    ],
    [
      {
        idEspacio: 1,
        idUnidad: 2,
        fecha: '2026-11-06',
        horaInicio: '12:00',
        invitados: -1,
      },
      'Los invitados deben ser un número entero entre 0 y 1000',
    ],
  ])('al reservar con %j debe responder «%s»', async (datos, mensaje) => {
    const { mensajes } = await validar(CrearReservaDto, datos);

    expect(mensajes).toContain(mensaje);
  });

  it('debe exigir el motivo al cancelar', async () => {
    const { mensajes } = await validar(CancelarReservaDto, { motivo: '   ' });

    expect(mensajes).toContain('Indica el motivo de la cancelación');
  });

  it('debe dejar la observación de recepción opcional', async () => {
    const { dto, mensajes } = await validar(RecibirEspacioDto, {
      observaciones: '  ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.observaciones).toBeUndefined();
  });
});
