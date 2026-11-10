import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TipoRedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';
import { CambiarModuloDto, CambiarTipoDto } from './cambiar-comunidad.dto';
import { ListarBitacoraPlataformaDto } from './listar-bitacora-plataforma.dto';

const mensajesDe = async <T extends object>(
  clase: new () => T,
  datos: object,
) => {
  const errores = await validate(plainToInstance(clase, datos));
  return errores.flatMap((error) => Object.values(error.constraints ?? {}));
};

describe('DTO de Plataforma', () => {
  describe('CambiarModuloDto', () => {
    it.each([[true], [false]])('debe aceptar activo = %s', async (activo) => {
      expect(await mensajesDe(CambiarModuloDto, { activo })).toEqual([]);
    });

    it.each([[{}], [{ activo: 1 }], [{ activo: 'true' }]])(
      'debe rechazar %j',
      async (datos) => {
        expect(await mensajesDe(CambiarModuloDto, datos)).toContain(
          'activo debe ser true o false',
        );
      },
    );
  });

  describe('CambiarTipoDto', () => {
    it('debe aceptar un tipo válido', async () => {
      expect(
        await mensajesDe(CambiarTipoDto, { tipo: TipoRedVecinal.VILLA }),
      ).toEqual([]);
    });

    it('debe rechazar un tipo inexistente', async () => {
      expect(await mensajesDe(CambiarTipoDto, { tipo: 'Parcela' })).toContain(
        'El tipo debe ser Villa, Condominio o Edificio',
      );
    });
  });

  describe('ListarBitacoraPlataformaDto', () => {
    it('debe aceptar los filtros vacíos', async () => {
      expect(await mensajesDe(ListarBitacoraPlataformaDto, {})).toEqual([]);
    });

    it('debe convertir los números que llegan como texto en la consulta', async () => {
      const dto = plainToInstance(ListarBitacoraPlataformaDto, {
        comunidad: 'ninguna',
        antesDe: '40',
        limite: '20',
      });

      expect(await validate(dto)).toEqual([]);
      expect(dto.antesDe).toBe(40);
      expect(dto.limite).toBe(20);
    });

    it.each([
      [
        { comunidad: 'todas' },
        'comunidad debe ser el id de una comunidad o "ninguna"',
      ],
      [
        { comunidad: '0' },
        'comunidad debe ser el id de una comunidad o "ninguna"',
      ],
      [
        { comunidad: '1 OR 1=1' },
        'comunidad debe ser el id de una comunidad o "ninguna"',
      ],
      [{ antesDe: '0' }, 'antesDe debe ser un número entero'],
      [{ antesDe: 'abc' }, 'antesDe debe ser un número entero'],
      [{ limite: '101' }, 'limite debe ser un número entre 1 y 100'],
      [{ limite: '0' }, 'limite debe ser un número entre 1 y 100'],
    ])('debe rechazar %j', async (datos, mensaje) => {
      expect(await mensajesDe(ListarBitacoraPlataformaDto, datos)).toContain(
        mensaje,
      );
    });
  });
});
