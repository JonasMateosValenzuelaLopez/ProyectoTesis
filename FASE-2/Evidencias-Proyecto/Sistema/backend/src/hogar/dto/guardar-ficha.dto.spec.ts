import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TipoFicha } from '../entities/hogar-ficha.entity';
import { GuardarFichaDto } from './guardar-ficha.dto';

const AHORA = new Date('2026-11-04T15:00:00Z');

const validar = async (datos: object) => {
  const dto = plainToInstance(GuardarFichaDto, datos);
  const errores = await validate(dto);
  return {
    dto,
    mensajes: errores.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    ),
  };
};

describe('GuardarFichaDto', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: AHORA });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    [
      'Mantención completa',
      {
        tipo: TipoFicha.MANTENCION,
        titulo: 'Calefont',
        detalle: 'Logia',
        contactoNombre: 'Hugo Pinto',
        contactoTelefono: '+56955551212',
        fecha: '2025-11-04',
        fechaVence: '2026-11-20',
      },
    ],
    [
      'Garantía',
      {
        tipo: TipoFicha.GARANTIA,
        titulo: 'Refrigerador',
        fecha: '2026-01-10',
        fechaVence: '2027-01-10',
      },
    ],
    [
      'Pintura sin fecha',
      { tipo: TipoFicha.PINTURA, titulo: 'Living', detalle: 'SW 7036' },
    ],
    [
      'Medida',
      { tipo: TipoFicha.MEDIDA, titulo: 'Ventana', detalle: '120 × 140 cm' },
    ],
    [
      'Técnico con teléfono',
      {
        tipo: TipoFicha.TECNICO,
        titulo: 'Hugo Pinto',
        contactoTelefono: '+56955551212',
        fecha: '2026-11-04',
      },
    ],
    [
      'Otro con campos en null',
      {
        tipo: TipoFicha.OTRO,
        titulo: 'Lista',
        detalle: 'Leche',
        contactoNombre: null,
        contactoTelefono: null,
        fecha: null,
        fechaVence: null,
      },
    ],
  ])('debe aceptar una ficha válida: %s', async (_caso, datos) => {
    const { mensajes } = await validar(datos);

    expect(mensajes).toEqual([]);
  });

  it.each([
    [
      { tipo: TipoFicha.MANTENCION, titulo: 'Calefont' },
      'Una ficha de tipo Mantención requiere la fecha de vencimiento',
    ],
    [
      { tipo: TipoFicha.GARANTIA, titulo: 'Refri', fechaVence: '' },
      'Una ficha de tipo Garantía requiere la fecha de vencimiento',
    ],
    [
      {
        tipo: TipoFicha.PINTURA,
        titulo: 'Living',
        detalle: 'SW',
        fechaVence: '2027-01-01',
      },
      'Una ficha de tipo Pintura no lleva fecha de vencimiento',
    ],
    [
      {
        tipo: TipoFicha.MEDIDA,
        titulo: 'Ventana',
        detalle: '120',
        fecha: '2026-01-01',
      },
      'Una ficha de tipo Medida no lleva fecha',
    ],
    [
      { tipo: TipoFicha.OTRO, titulo: 'Lista', fecha: '2026-01-01' },
      'Una ficha de tipo Otro no lleva fecha',
    ],
    [
      { tipo: TipoFicha.PINTURA, titulo: 'Living', detalle: '   ' },
      'Una ficha de tipo Pintura requiere el detalle',
    ],
    [
      { tipo: TipoFicha.MEDIDA, titulo: 'Ventana' },
      'Una ficha de tipo Medida requiere el detalle',
    ],
    [
      {
        tipo: TipoFicha.TECNICO,
        titulo: 'Hugo',
        contactoNombre: 'Hugo Pinto',
      },
      'Una ficha de tipo Técnico no lleva nombre de contacto',
    ],
    [
      {
        tipo: TipoFicha.GARANTIA,
        titulo: 'Refri',
        contactoTelefono: '+56955551212',
        fechaVence: '2027-01-01',
      },
      'Una ficha de tipo Garantía no lleva teléfono de contacto',
    ],
    [
      {
        tipo: TipoFicha.OTRO,
        titulo: 'Lista',
        contactoTelefono: '+56955551212',
      },
      'Una ficha de tipo Otro no lleva teléfono de contacto',
    ],
    [
      {
        tipo: TipoFicha.GARANTIA,
        titulo: 'Refri',
        fecha: '2026-05-01',
        fechaVence: '2026-05-01',
      },
      'La fecha de vencimiento debe ser posterior a la fecha',
    ],
  ])('debe rechazar la combinación %o', async (datos, mensaje) => {
    const { mensajes } = await validar(datos);

    expect(mensajes).toEqual([mensaje]);
  });

  it('debe rechazar una fecha futura', async () => {
    const { mensajes } = await validar({
      tipo: TipoFicha.PINTURA,
      titulo: 'Living',
      detalle: 'SW',
      fecha: '2026-11-05',
    });

    expect(mensajes).toEqual(['La fecha no puede ser futura']);
  });

  it.each([['2026-02-30'], ['04-11-2026'], ['2026-11-04T10:00:00Z']])(
    'debe rechazar la fecha mal escrita %s',
    async (fechaVence) => {
      const { mensajes } = await validar({
        tipo: TipoFicha.GARANTIA,
        titulo: 'Refri',
        fechaVence,
      });

      expect(mensajes).toContain(
        'La fecha debe tener el formato AAAA-MM-DD y existir',
      );
    },
  );

  it.each([['Ventana'], ['VENTANA'], ['']])(
    'debe rechazar el tipo %p',
    async (tipo) => {
      const { mensajes } = await validar({ tipo, titulo: 'Algo' });

      expect(mensajes).toEqual([
        'El tipo debe ser Pintura, Garantía, Mantención, Medida, Técnico u Otro',
      ]);
    },
  );

  it.each([[''], ['   '], [undefined]])(
    'debe exigir el título cuando llega %p',
    async (titulo) => {
      const { mensajes } = await validar({ tipo: TipoFicha.OTRO, titulo });

      expect(mensajes).toContain('El título es obligatorio');
    },
  );

  it('debe rechazar textos más largos que la columna', async () => {
    const { mensajes } = await validar({
      tipo: TipoFicha.MANTENCION,
      titulo: 'a'.repeat(101),
      detalle: 'b'.repeat(2001),
      contactoNombre: 'c'.repeat(101),
      fechaVence: '2027-01-01',
    });

    expect(mensajes).toEqual(
      expect.arrayContaining([
        'El título no puede superar 100 caracteres',
        'El detalle no puede superar 2000 caracteres',
        'El nombre de contacto no puede superar 100 caracteres',
      ]),
    );
  });

  it('debe quitar los espacios del teléfono y validar su formato', async () => {
    const valido = await validar({
      tipo: TipoFicha.TECNICO,
      titulo: 'Hugo',
      contactoTelefono: ' +569 5555 1212 ',
    });
    const invalido = await validar({
      tipo: TipoFicha.TECNICO,
      titulo: 'Hugo',
      contactoTelefono: '56955551212',
    });

    expect(valido.mensajes).toEqual([]);
    expect(valido.dto.contactoTelefono).toBe('+56955551212');
    expect(invalido.mensajes).toEqual([
      'El teléfono debe tener el formato +56912345678',
    ]);
  });

  it('debe conservar los saltos de línea del detalle y recortar los extremos', async () => {
    const { dto, mensajes } = await validar({
      tipo: TipoFicha.OTRO,
      titulo: '  Lista del supermercado ',
      detalle: '  Leche\r\nPan\rDetergente\n ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.titulo).toBe('Lista del supermercado');
    expect(dto.detalle).toBe('Leche\nPan\nDetergente');
  });
});
