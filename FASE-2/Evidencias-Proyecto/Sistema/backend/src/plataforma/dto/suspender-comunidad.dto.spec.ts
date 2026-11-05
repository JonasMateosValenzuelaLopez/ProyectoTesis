import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SuspenderComunidadDto } from './suspender-comunidad.dto';

const validar = async (datos: object) => {
  const dto = plainToInstance(SuspenderComunidadDto, datos);
  const errores = await validate(dto);
  return {
    dto,
    mensajes: errores.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    ),
  };
};

describe('SuspenderComunidadDto', () => {
  it('debe aceptar un motivo y recortarlo', async () => {
    const { dto, mensajes } = await validar({
      motivo: '  La comunidad pidió pausar el servicio  ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.motivo).toBe('La comunidad pidió pausar el servicio');
  });

  it('debe aceptar un motivo de 255 caracteres', async () => {
    const { mensajes } = await validar({ motivo: 'a'.repeat(255) });

    expect(mensajes).toEqual([]);
  });

  it.each([
    [{}, 'El motivo es obligatorio'],
    [{ motivo: '   ' }, 'El motivo es obligatorio'],
    [{ motivo: 5 }, 'El motivo es obligatorio'],
    [{ motivo: 'a'.repeat(256) }, 'El motivo no puede superar 255 caracteres'],
  ])('con %j debe responder «%s»', async (datos, mensaje) => {
    const { mensajes } = await validar(datos);

    expect(mensajes).toContain(mensaje);
  });
});
