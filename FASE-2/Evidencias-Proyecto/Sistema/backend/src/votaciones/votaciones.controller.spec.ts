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
import {
  camposDeValidacion,
  mensajesDeValidacion,
} from '../common/utils/validacion';
import { ActasController } from './actas.controller';
import {
  CrearVotacionDto,
  GuardarActaDto,
  VotarDto,
} from './dto/votaciones.dto';
import { VotacionesController } from './votaciones.controller';

const reflector = new Reflector();
const DIRECTIVA = [RolUsuario.SECRETARIO, RolUsuario.PRESIDENTE];

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

describe.each([
  ['VotacionesController', VotacionesController],
  ['ActasController', ActasController],
] as const)('%s', (_nombre, controlador) => {
  it('debe exigir sesión, comunidad y el módulo de votaciones', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, controlador)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(reflector.get(MODULO_KEY, controlador)).toBe(
      CodigoModulo.VOTACIONES,
    );
  });
});

describe('VotacionesController', () => {
  const metodo = (nombre: keyof VotacionesController) =>
    VotacionesController.prototype[nombre];

  it.each([['listar'], ['votar']] as const)(
    'debe dejar %s a toda la comunidad',
    (nombre) => {
      expect(reflector.get(ROLES_KEY, metodo(nombre))).toBeUndefined();
    },
  );

  it.each([['crear'], ['cerrar'], ['recordar']] as const)(
    'debe dejar %s solo a Secretaría y Presidencia',
    (nombre) => {
      expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual(DIRECTIVA);
    },
  );

  it('debe limitar los recordatorios a 5 por minuto', () => {
    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', metodo('recordar')),
    ).toBe(5);
  });
});

describe('ActasController', () => {
  const metodo = (nombre: keyof ActasController) =>
    ActasController.prototype[nombre];

  it('debe dejar ver las actas a toda la comunidad', () => {
    expect(reflector.get(ROLES_KEY, metodo('listar'))).toBeUndefined();
  });

  it.each([['crear'], ['editar'], ['publicar'], ['eliminar']] as const)(
    'debe dejar %s solo a Secretaría y Presidencia',
    (nombre) => {
      expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual(DIRECTIVA);
    },
  );
});

describe('DTO de votaciones', () => {
  const votacion = {
    tipo: 'Votación',
    titulo: ' ¿Pintamos? ',
    opciones: [' A favor ', 'En contra'],
    fechaCierre: '2026-11-12',
    quorum: 50,
  };

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-05T15:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debe recortar la pregunta y las opciones', async () => {
    const { dto, mensajes } = await validar(CrearVotacionDto, votacion);

    expect(mensajes).toEqual([]);
    expect(dto.titulo).toBe('¿Pintamos?');
    expect(dto.opciones).toEqual(['A favor', 'En contra']);
  });

  it.each([
    [{ tipo: 'Plebiscito' }, 'El tipo debe ser Votación o Encuesta'],
    [{ opciones: ['Sí'] }, 'Indica entre 2 y 6 opciones'],
    [
      { opciones: ['1', '2', '3', '4', '5', '6', '7'] },
      'Indica entre 2 y 6 opciones',
    ],
    [{ opciones: ['Sí', '  '] }, 'Una opción está vacía'],
    [{ quorum: 0 }, 'El quórum debe ser un porcentaje entre 1 y 100'],
    [{ quorum: 101 }, 'El quórum debe ser un porcentaje entre 1 y 100'],
    [{ quorum: 50.5 }, 'El quórum debe ser un porcentaje entre 1 y 100'],
    [
      { fechaCierre: '12-11-2026' },
      'La fecha debe tener el formato AAAA-MM-DD y existir',
    ],
  ])('con %j debe responder «%s»', async (cambios, mensaje) => {
    const { mensajes } = await validar(CrearVotacionDto, {
      ...votacion,
      ...cambios,
    });

    expect(mensajes).toContain(mensaje);
  });

  it.each([
    [{ quorum: undefined }, 'Indica el quórum mínimo de la votación'],
    [{ tipo: 'Encuesta' }, 'Una encuesta no tiene quórum'],
    [
      { fechaCierre: '2026-11-05' },
      'La fecha de cierre debe ser posterior a hoy',
    ],
    [
      { fechaCierre: '2027-02-04' },
      'Una votación puede estar abierta hasta 90 días',
    ],
  ])('con %j debe marcar el campo con «%s»', async (cambios, mensaje) => {
    const dto = plainToInstance(CrearVotacionDto, {
      ...votacion,
      ...cambios,
    });

    const campos = camposDeValidacion(await validate(dto));

    expect(Object.values(campos)).toEqual([mensaje]);
  });

  it.each([
    ['una encuesta sin quórum', { tipo: 'Encuesta', quorum: undefined }],
    ['un cierre mañana', { fechaCierre: '2026-11-06' }],
    ['un cierre a 90 días', { fechaCierre: '2027-02-03' }],
  ])('debe aceptar %s', async (_caso, cambios) => {
    const { mensajes } = await validar(CrearVotacionDto, {
      ...votacion,
      ...cambios,
    });

    expect(mensajes).toEqual([]);
  });

  it('debe tomar el día de Chile para decidir si el cierre es posterior a hoy', async () => {
    jest.setSystemTime(new Date('2026-11-06T02:00:00Z'));

    const { mensajes } = await validar(CrearVotacionDto, {
      ...votacion,
      fechaCierre: '2026-11-06',
    });

    expect(mensajes).toEqual([]);
  });

  it('debe exigir opción y vivienda al votar', async () => {
    const { mensajes } = await validar(VotarDto, {});

    expect(mensajes).toEqual(
      expect.arrayContaining(['Elige una opción', 'Elige tu vivienda']),
    );
  });
});

describe('DTO de actas', () => {
  const acta = {
    tipo: 'Asamblea ordinaria',
    fecha: '2026-11-05',
    lugar: ' Sede ',
    temas: 'Reja\r\nPiscina',
    acuerdos: [{ texto: ' Cotizar ', responsable: ' ', plazo: '' }],
  };

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-05T15:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debe normalizar el acta y dejar vacíos los datos opcionales de un acuerdo', async () => {
    const { dto, mensajes } = await validar(GuardarActaDto, acta);

    expect(mensajes).toEqual([]);
    expect(dto.lugar).toBe('Sede');
    expect(dto.temas).toBe('Reja\nPiscina');
    expect(dto.acuerdos[0]).toEqual({
      texto: 'Cotizar',
      responsable: undefined,
      plazo: undefined,
    });
  });

  it.each([
    [{ tipo: 'Asamblea' }, 'Elige el tipo de reunión'],
    [{ fecha: '2026-11-06' }, 'La fecha no puede ser futura'],
    [{ lugar: '' }, 'El lugar es obligatorio'],
    [{ temas: '   ' }, 'Indica al menos un tema tratado'],
    [
      { unidadesPresentes: -1 },
      'Las unidades presentes no pueden ser negativas',
    ],
    [{ acuerdos: [{ texto: '' }] }, 'El acuerdo es obligatorio'],
    [
      { acuerdos: Array.from({ length: 31 }, () => ({ texto: 'Cotizar' })) },
      'Un acta puede tener hasta 30 acuerdos',
    ],
    [{ acuerdos: undefined }, 'Los acuerdos deben ser una lista'],
  ])('con %j debe responder «%s»', async (cambios, mensaje) => {
    const { mensajes } = await validar(GuardarActaDto, { ...acta, ...cambios });

    expect(mensajes).toContain(mensaje);
  });
});
