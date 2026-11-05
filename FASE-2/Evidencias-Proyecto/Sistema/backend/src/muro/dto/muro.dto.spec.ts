import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mensajesDeValidacion } from '../../common/utils/validacion';
import {
  PaginaMuroDto,
  PublicarOficialDto,
  PublicarVecinoDto,
  ReportarPublicacionDto,
} from './muro.dto';

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

describe('DTO del muro', () => {
  it('PublicarVecinoDto debe aceptar un mensaje y conservar sus saltos de línea', async () => {
    const { dto, mensajes } = await validar(PublicarVecinoDto, {
      contenido: '  ¿Alguien perdió\r\nun gato?  ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.contenido).toBe('¿Alguien perdió\nun gato?');
  });

  it.each([
    [{ contenido: 'Hola' }, 'El mensaje debe tener al menos 5 caracteres'],
    [
      { contenido: 'a'.repeat(501) },
      'El mensaje no puede superar 500 caracteres',
    ],
    [{ contenido: '   ' }, 'Escribe tu mensaje'],
    [{ contenido: 'Mensaje válido', idUnidad: 0 }, 'La unidad no es válida'],
  ])('PublicarVecinoDto con %j debe responder «%s»', async (datos, mensaje) => {
    const { mensajes } = await validar(PublicarVecinoDto, datos);

    expect(mensajes).toContain(mensaje);
  });

  const oficial = {
    tipo: 'Comunicado',
    titulo: 'Corte de agua',
    contenido: 'Mañana se corta el agua entre las 9:00 y las 13:00.',
  };

  it.each([['Comunicado'], ['Norma']])(
    'PublicarOficialDto debe aceptar el tipo %s',
    async (tipo) => {
      const { mensajes } = await validar(PublicarOficialDto, {
        ...oficial,
        tipo,
      });

      expect(mensajes).toEqual([]);
    },
  );

  it.each([
    [{ tipo: 'Vecino' }, 'El tipo debe ser Comunicado o Norma'],
    [{ titulo: '' }, 'El título es obligatorio'],
    [{ contenido: 'Muy corto' }, 'El texto debe tener al menos 20 caracteres'],
  ])(
    'PublicarOficialDto con %j debe responder «%s»',
    async (cambios, mensaje) => {
      const { mensajes } = await validar(PublicarOficialDto, {
        ...oficial,
        ...cambios,
      });

      expect(mensajes).toContain(mensaje);
    },
  );

  it('ReportarPublicacionDto debe exigir el motivo', async () => {
    const { mensajes } = await validar(ReportarPublicacionDto, { motivo: ' ' });

    expect(mensajes).toContain('Indica el motivo del reporte');
  });

  it('PaginaMuroDto debe convertir los números de la consulta', async () => {
    const { dto, mensajes } = await validar(PaginaMuroDto, {
      antesDe: '30',
      limite: '20',
    });

    expect(mensajes).toEqual([]);
    expect(dto).toEqual({ antesDe: 30, limite: 20 });
  });
});
