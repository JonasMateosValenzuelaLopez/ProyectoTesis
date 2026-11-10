import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  BloquearCuentaDto,
  ListarPersonasDto,
} from './personas-plataforma.dto';

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  const errores = await validate(dto);
  return {
    dto,
    mensajes: errores.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    ),
  };
};

describe('ListarPersonasDto', () => {
  it('debe aceptar una consulta sin filtros', async () => {
    const { mensajes } = await validar(ListarPersonasDto, {});

    expect(mensajes).toEqual([]);
  });

  it('debe recortar la búsqueda y convertir los números del query', async () => {
    const { dto, mensajes } = await validar(ListarPersonasDto, {
      buscar: '  Ana  ',
      filtro: 'bloqueadas',
      antesDe: '40',
      limite: '10',
    });

    expect(mensajes).toEqual([]);
    expect(dto).toEqual({
      buscar: 'Ana',
      filtro: 'bloqueadas',
      antesDe: 40,
      limite: 10,
    });
  });

  it('debe ignorar una búsqueda vacía', async () => {
    const { dto, mensajes } = await validar(ListarPersonasDto, {
      buscar: '   ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.buscar).toBeUndefined();
  });

  it.each([
    [{ buscar: 'a' }, 'Escribe al menos 2 caracteres para buscar'],
    [
      { buscar: 'a'.repeat(101) },
      'La búsqueda no puede superar 100 caracteres',
    ],
    [{ filtro: 'activas' }, 'filtro debe ser todas, bloqueadas o plataforma'],
    [{ antesDe: '0' }, 'antesDe debe ser un número entero'],
    [{ antesDe: 'abc' }, 'antesDe debe ser un número entero'],
    [{ limite: '0' }, 'limite debe ser un número entre 1 y 100'],
    [{ limite: '101' }, 'limite debe ser un número entre 1 y 100'],
  ])('con %j debe responder «%s»', async (datos, mensaje) => {
    const { mensajes } = await validar(ListarPersonasDto, datos);

    expect(mensajes).toContain(mensaje);
  });
});

describe('BloquearCuentaDto', () => {
  it('debe aceptar un motivo y recortarlo', async () => {
    const { dto, mensajes } = await validar(BloquearCuentaDto, {
      motivo: '  Suplantación de identidad  ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.motivo).toBe('Suplantación de identidad');
  });

  it.each([
    [{}, 'El motivo es obligatorio'],
    [{ motivo: '   ' }, 'El motivo es obligatorio'],
    [{ motivo: 5 }, 'El motivo es obligatorio'],
    [{ motivo: 'a'.repeat(256) }, 'El motivo no puede superar 255 caracteres'],
  ])('con %j debe responder «%s»', async (datos, mensaje) => {
    const { mensajes } = await validar(BloquearCuentaDto, datos);

    expect(mensajes).toContain(mensaje);
  });
});
