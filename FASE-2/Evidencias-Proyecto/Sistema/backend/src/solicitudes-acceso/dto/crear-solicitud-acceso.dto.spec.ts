import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearSolicitudAccesoDto } from './crear-solicitud-acceso.dto';

const datosValidos = {
  idRed: 3,
  identificador: '12.345.678-5',
  nombre: ' Ana ',
  primerApellido: 'Pérez',
  segundoApellido: 'Soto',
  correo: 'Ana@Correo.cl',
  numeroUnidad: 'A-101',
};

const validar = async (datos: object) => {
  const dto = plainToInstance(CrearSolicitudAccesoDto, datos);
  const errores = await validate(dto);
  return {
    dto,
    mensajes: errores.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    ),
  };
};

describe('CrearSolicitudAccesoDto', () => {
  it('debe normalizar identificador, correo y textos', async () => {
    const { dto, mensajes } = await validar(datosValidos);

    expect(mensajes).toEqual([]);
    expect(dto.identificador).toBe('12345678-5');
    expect(dto.tipoResidencia).toBeUndefined();
    expect(dto.correo).toBe('ana@correo.cl');
    expect(dto.nombre).toBe('Ana');
  });

  it.each([
    ['ausente', undefined],
    ['vacío', ''],
    ['solo espacios', '   '],
  ])(
    'debe tratar el teléfono %s como no informado',
    async (_caso, telefono) => {
      const { dto, mensajes } = await validar({ ...datosValidos, telefono });

      expect(mensajes).toEqual([]);
      expect(dto.telefono).toBeUndefined();
    },
  );

  it('debe exigir el primer apellido', async () => {
    const { mensajes } = await validar({
      ...datosValidos,
      primerApellido: ' ',
    });

    expect(mensajes).toEqual(['El primer apellido es obligatorio']);
  });

  it.each([
    ['ausente', undefined],
    ['vacío', ''],
    ['solo espacios', '   '],
  ])(
    'debe aceptar la solicitud con el segundo apellido %s',
    async (_caso, segundoApellido) => {
      const { dto, mensajes } = await validar({
        ...datosValidos,
        segundoApellido,
      });

      expect(mensajes).toEqual([]);
      expect(dto.segundoApellido).toBeUndefined();
    },
  );

  it('debe recortar el segundo apellido informado', async () => {
    const { dto, mensajes } = await validar({
      ...datosValidos,
      segundoApellido: ' Soto ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.segundoApellido).toBe('Soto');
  });

  it.each([
    ['ausente', undefined],
    ['vacío', ''],
    ['solo espacios', '   '],
  ])('debe tratar el mensaje %s como no informado', async (_caso, mensaje) => {
    const { dto, mensajes } = await validar({ ...datosValidos, mensaje });

    expect(mensajes).toEqual([]);
    expect(dto.mensaje).toBeUndefined();
  });

  it('debe aceptar un mensaje de 255 caracteres y recortarlo', async () => {
    const mensaje = 'a'.repeat(255);

    const { dto, mensajes } = await validar({
      ...datosValidos,
      mensaje: ` ${mensaje} `,
    });

    expect(mensajes).toEqual([]);
    expect(dto.mensaje).toBe(mensaje);
  });

  it('debe rechazar un mensaje de más de 255 caracteres', async () => {
    const { mensajes } = await validar({
      ...datosValidos,
      mensaje: 'a'.repeat(256),
    });

    expect(mensajes).toEqual(['El mensaje no puede superar 255 caracteres']);
  });

  it('debe rechazar un teléfono con formato inválido', async () => {
    const { mensajes } = await validar({ ...datosValidos, telefono: '12ab' });

    expect(mensajes).toEqual(['El teléfono no es válido']);
  });

  it('debe rechazar un RUT inválido', async () => {
    const { mensajes } = await validar({
      ...datosValidos,
      identificador: '1-1',
    });

    expect(mensajes).toEqual(['El RUT no es válido']);
  });

  it('debe aceptar el tipo de residencia Arrendatario', async () => {
    const { dto, mensajes } = await validar({
      ...datosValidos,
      tipoResidencia: 'Arrendatario',
    });

    expect(mensajes).toEqual([]);
    expect(dto.tipoResidencia).toBe('Arrendatario');
  });

  it('debe rechazar un tipo de residencia desconocido', async () => {
    const { mensajes } = await validar({
      ...datosValidos,
      tipoResidencia: 'Allegado',
    });

    expect(mensajes).toEqual([
      'El tipo de residencia debe ser Propietario o Arrendatario',
    ]);
  });
});
