import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mensajesDeValidacion } from '../../common/utils/validacion';
import { CrearLoteUnidadesDto, EditarUnidadDto } from './unidades.dto';

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

describe('DTO de unidades', () => {
  describe('CrearLoteUnidadesDto', () => {
    it('debe aceptar un lote de edificio y pasar la torre a mayúsculas', async () => {
      const { dto, mensajes } = await validar(CrearLoteUnidadesDto, {
        torre: ' b ',
        pisoDesde: 1,
        pisoHasta: 8,
        porPiso: 4,
      });

      expect(mensajes).toEqual([]);
      expect(dto.torre).toBe('B');
    });

    it('debe aceptar un lote de casas y recortar el grupo', async () => {
      const { dto, mensajes } = await validar(CrearLoteUnidadesDto, {
        grupo: '  Pasaje 2 ',
        desde: 1,
        hasta: 10,
      });

      expect(mensajes).toEqual([]);
      expect(dto.grupo).toBe('Pasaje 2');
    });

    it.each([
      [{ torre: 'ABCD' }, 'La torre debe tener de 1 a 3 letras o números'],
      [{ pisoDesde: 0 }, 'El piso inicial debe ser un número entre 1 y 99'],
      [{ pisoHasta: 100 }, 'El piso final debe ser un número entre 1 y 99'],
      [{ porPiso: 31 }, 'Los departamentos por piso deben ser entre 1 y 30'],
      [{ grupo: '  ' }, 'Indica la hilera, pasaje o manzana'],
      [{ desde: 1.5 }, 'El número inicial debe ser un entero entre 1 y 99999'],
      [{ hasta: 100000 }, 'El número final debe ser un entero entre 1 y 99999'],
    ])('con %j debe responder «%s»', async (datos, mensaje) => {
      const { mensajes } = await validar(CrearLoteUnidadesDto, datos);

      expect(mensajes).toContain(mensaje);
    });
  });

  describe('EditarUnidadDto', () => {
    it.each([['27'], ['B-101'], ['PH1']])(
      'debe aceptar el número %s',
      async (numero) => {
        const { mensajes } = await validar(EditarUnidadDto, {
          numeroIdentificador: numero,
        });

        expect(mensajes).toEqual([]);
      },
    );

    it.each([
      ['   ', 'El número es obligatorio'],
      ['a'.repeat(21), 'El número no puede superar 20 caracteres'],
      ['27 B', 'El número solo puede tener letras, números y guiones'],
      ["1'; --", 'El número solo puede tener letras, números y guiones'],
    ])('con %j debe responder «%s»', async (numero, mensaje) => {
      const { mensajes } = await validar(EditarUnidadDto, {
        numeroIdentificador: numero,
      });

      expect(mensajes).toContain(mensaje);
    });
  });
});
