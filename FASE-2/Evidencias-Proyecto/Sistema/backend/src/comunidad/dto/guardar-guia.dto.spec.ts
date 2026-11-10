import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DiaSemana } from '../entities/comunidad-guia.entity';
import { GuardarGuiaDto } from './guardar-guia.dto';

const validar = async (datos: object) => {
  const dto = plainToInstance(GuardarGuiaDto, datos);
  const errores = await validate(dto);
  return {
    dto,
    mensajes: errores.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    ),
  };
};

describe('GuardarGuiaDto', () => {
  it('debe aceptar una guía completa', async () => {
    const { mensajes } = await validar({
      mensaje: 'Somos 15 casas.',
      basuraDias: [DiaSemana.LUNES, DiaSemana.JUEVES],
      basuraHorario: 'Desde las 21:00',
      basuraLugar: 'Contenedor verde',
      reciclajeLugar: 'Punto limpio',
      reciclajeDetalle: 'Vidrio y latas',
    });

    expect(mensajes).toEqual([]);
  });

  it('debe aceptar una guía vacía', async () => {
    const { mensajes } = await validar({});

    expect(mensajes).toEqual([]);
  });

  it('debe aceptar null en los campos para vaciarlos', async () => {
    const { mensajes } = await validar({ mensaje: null, basuraDias: null });

    expect(mensajes).toEqual([]);
  });

  it('debe conservar los saltos de línea del mensaje y recortar los extremos', async () => {
    const { dto } = await validar({ mensaje: '  Hola\r\nvecinos  ' });

    expect(dto.mensaje).toBe('Hola\nvecinos');
  });

  it('debe tratar los textos vacíos como no informados', async () => {
    const { dto, mensajes } = await validar({
      mensaje: '   ',
      basuraHorario: '',
      reciclajeDetalle: '  ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.mensaje).toBeUndefined();
    expect(dto.basuraHorario).toBeUndefined();
    expect(dto.reciclajeDetalle).toBeUndefined();
  });

  it.each([
    ['mensaje', 500, 'El mensaje no puede superar 500 caracteres'],
    [
      'basuraHorario',
      60,
      'El horario de basura no puede superar 60 caracteres',
    ],
    ['basuraLugar', 150, 'El lugar de basura no puede superar 150 caracteres'],
    [
      'reciclajeLugar',
      150,
      'El lugar de reciclaje no puede superar 150 caracteres',
    ],
    [
      'reciclajeDetalle',
      255,
      'El detalle de reciclaje no puede superar 255 caracteres',
    ],
  ])(
    'debe aceptar %s con %i caracteres y rechazarlo con uno más',
    async (campo, largo, mensaje) => {
      const enElLimite = await validar({ [campo]: 'a'.repeat(largo) });
      const pasado = await validar({ [campo]: 'a'.repeat(largo + 1) });

      expect(enElLimite.mensajes).toEqual([]);
      expect(pasado.mensajes).toContain(mensaje);
    },
  );

  it('debe rechazar un texto que no es texto', async () => {
    const { mensajes } = await validar({ basuraLugar: 42 });

    expect(mensajes).toContain('El lugar de basura debe ser texto');
  });

  it('debe rechazar los días que no son una lista', async () => {
    const { mensajes } = await validar({ basuraDias: 'Lunes' });

    expect(mensajes).toContain('Los días de basura deben ser una lista');
  });

  it('debe rechazar un día inexistente', async () => {
    const { mensajes } = await validar({ basuraDias: ['Lunes', 'Feriado'] });

    expect(mensajes).toContain(
      'Cada día debe ser Lunes, Martes, Miércoles, Jueves, Viernes, Sábado o Domingo',
    );
  });

  it('debe rechazar un día sin tilde, porque la BD guarda el nombre exacto', async () => {
    const { mensajes } = await validar({ basuraDias: ['Miercoles'] });

    expect(mensajes).toHaveLength(1);
  });

  it('debe rechazar días repetidos', async () => {
    const { mensajes } = await validar({ basuraDias: ['Lunes', 'Lunes'] });

    expect(mensajes).toContain('No repitas días de basura');
  });
});
