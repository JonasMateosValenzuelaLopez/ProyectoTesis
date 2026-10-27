import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearSolicitudAccesoDto } from './crear-solicitud-acceso.dto';

const datosValidos = {
  idRed: 3,
  rut: '12.345.678-5',
  nombre: ' Ana ',
  apellidoPaterno: 'Pérez',
  apellidoMaterno: 'Soto',
  correo: 'Ana@Correo.cl',
  numeroUnidad: 'A-101',
};

// Igual que el ValidationPipe global: transforma y luego valida.
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
  it('debe normalizar RUT, correo y textos', async () => {
    // Act
    const { dto, mensajes } = await validar(datosValidos);

    // Assert
    expect(mensajes).toEqual([]);
    expect(dto.rut).toBe('12345678-5');
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
      // Act
      const { dto, mensajes } = await validar({ ...datosValidos, telefono });

      // Assert
      expect(mensajes).toEqual([]);
      expect(dto.telefono).toBeUndefined();
    },
  );

  it('debe rechazar un teléfono con formato inválido', async () => {
    // Act
    const { mensajes } = await validar({ ...datosValidos, telefono: '12ab' });

    // Assert
    expect(mensajes).toEqual(['El teléfono no es válido']);
  });

  it('debe rechazar un RUT inválido', async () => {
    // Act
    const { mensajes } = await validar({ ...datosValidos, rut: '1-1' });

    // Assert
    expect(mensajes).toEqual(['El RUT no es válido']);
  });
});
