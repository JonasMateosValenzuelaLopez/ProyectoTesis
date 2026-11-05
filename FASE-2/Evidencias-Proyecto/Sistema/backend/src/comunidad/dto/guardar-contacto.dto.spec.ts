import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GuardarContactoDto } from './guardar-contacto.dto';

const validar = async (datos: object) => {
  const dto = plainToInstance(GuardarContactoDto, datos);
  const errores = await validate(dto);
  return {
    dto,
    mensajes: errores.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    ),
  };
};

const completo = {
  nombre: 'Conserjería',
  detalle: 'Visitas y encomiendas',
  telefono: '+56452210890',
  horario: 'Todos los días, 24 horas',
  visible: false,
};

describe('GuardarContactoDto', () => {
  it('debe aceptar un contacto completo', async () => {
    const { mensajes } = await validar(completo);

    expect(mensajes).toEqual([]);
  });

  it('debe aceptar un contacto solo con nombre y teléfono', async () => {
    const { mensajes } = await validar({
      nombre: 'Plan Cuadrante',
      telefono: '+56988880014',
    });

    expect(mensajes).toEqual([]);
  });

  it('debe quitar los espacios del teléfono antes de validarlo', async () => {
    const { dto, mensajes } = await validar({
      ...completo,
      telefono: '+56 2 2345 6789',
    });

    expect(mensajes).toEqual([]);
    expect(dto.telefono).toBe('+56223456789');
  });

  it('debe recortar el nombre y tratar los textos vacíos como no informados', async () => {
    const { dto } = await validar({
      ...completo,
      nombre: '  Conserjería  ',
      detalle: '   ',
      horario: '',
    });

    expect(dto.nombre).toBe('Conserjería');
    expect(dto.detalle).toBeUndefined();
    expect(dto.horario).toBeUndefined();
  });

  it.each([
    [{ nombre: '   ' }, 'El nombre es obligatorio'],
    [{ nombre: undefined }, 'El nombre es obligatorio'],
    [{ nombre: 'a'.repeat(101) }, 'El nombre no puede superar 100 caracteres'],
    [
      { detalle: 'a'.repeat(151) },
      'El detalle no puede superar 150 caracteres',
    ],
    [
      { horario: 'a'.repeat(101) },
      'El horario no puede superar 100 caracteres',
    ],
    [{ telefono: undefined }, 'El teléfono es obligatorio'],
    [{ telefono: '  ' }, 'El teléfono es obligatorio'],
    [
      { telefono: '56223456789' },
      'El teléfono debe tener el formato +56912345678',
    ],
    [{ telefono: '+5612' }, 'El teléfono debe tener el formato +56912345678'],
    [
      { telefono: '+56-9-1234-5678' },
      'El teléfono debe tener el formato +56912345678',
    ],
    [{ visible: 1 }, 'visible debe ser true o false'],
  ])('con %j debe responder «%s»', async (cambios, mensaje) => {
    const { mensajes } = await validar({ ...completo, ...cambios });

    expect(mensajes).toContain(mensaje);
  });

  it.each([
    ['nombre', 100],
    ['detalle', 150],
    ['horario', 100],
  ])('debe aceptar %s con %i caracteres', async (campo, largo) => {
    const { mensajes } = await validar({
      ...completo,
      [campo]: 'a'.repeat(largo),
    });

    expect(mensajes).toEqual([]);
  });
});
