import { TipoRedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { TipoUnidad } from '../unidades/entities/unidad.entity';
import { errorEstructura, generarUnidades } from './estructura-unidades';

describe('estructura de unidades', () => {
  describe('generarUnidades', () => {
    it('debe numerar los departamentos de un edificio por piso, con la torre A por defecto', () => {
      const unidades = generarUnidades(TipoRedVecinal.EDIFICIO, {
        pisos: 2,
        porPiso: 3,
      });

      expect(unidades.map((u) => u.numeroIdentificador)).toEqual([
        '101',
        '102',
        '103',
        '201',
        '202',
        '203',
      ]);
      expect(unidades[4]).toEqual({
        numeroIdentificador: '202',
        tipo: TipoUnidad.DEPARTAMENTO,
        callePasaje: 'Torre A',
        torre: 'A',
        piso: 2,
        manzana: null,
        orden: 5,
      });
    });

    it('debe rellenar con cero los departamentos de una cifra aunque haya más de 9 por piso', () => {
      const unidades = generarUnidades(TipoRedVecinal.EDIFICIO, {
        torre: 'B',
        pisos: 12,
        porPiso: 12,
      });

      expect(unidades).toHaveLength(144);
      expect(unidades.at(-1)).toEqual(
        expect.objectContaining({
          numeroIdentificador: '1212',
          callePasaje: 'Torre B',
          piso: 12,
        }),
      );
    });

    it('debe numerar seguidas las casas de un condominio, primero el lado norte', () => {
      const unidades = generarUnidades(TipoRedVecinal.CONDOMINIO, {
        norte: 2,
        sur: 2,
      });

      expect(
        unidades.map((u) => [u.numeroIdentificador, u.callePasaje]),
      ).toEqual([
        ['1', 'Lado norte'],
        ['2', 'Lado norte'],
        ['3', 'Lado sur'],
        ['4', 'Lado sur'],
      ]);
      expect(unidades.every((u) => u.tipo === TipoUnidad.CASA)).toBe(true);
    });

    it('debe aceptar un condominio sin lado sur', () => {
      const unidades = generarUnidades(TipoRedVecinal.CONDOMINIO, {
        norte: 3,
      });

      expect(unidades.map((u) => u.callePasaje)).toEqual([
        'Lado norte',
        'Lado norte',
        'Lado norte',
      ]);
    });

    it('debe numerar seguidas las casas de una villa, de una manzana a la otra', () => {
      const unidades = generarUnidades(TipoRedVecinal.VILLA, {
        manzanas: 2,
        casasPorManzana: 2,
      });

      expect(
        unidades.map((u) => [u.numeroIdentificador, u.manzana, u.orden]),
      ).toEqual([
        ['1', 'A', 1],
        ['2', 'A', 2],
        ['3', 'B', 3],
        ['4', 'B', 4],
      ]);
      expect(unidades[2].callePasaje).toBe('Manzana B');
    });

    it('debe generar el máximo de una villa sin números repetidos', () => {
      const unidades = generarUnidades(TipoRedVecinal.VILLA, {
        manzanas: 26,
        casasPorManzana: 100,
      });

      expect(unidades).toHaveLength(2600);
      expect(new Set(unidades.map((u) => u.numeroIdentificador)).size).toBe(
        2600,
      );
      expect(unidades.at(-1)?.callePasaje).toBe('Manzana Z');
    });
  });

  describe('errorEstructura', () => {
    it.each([
      [TipoRedVecinal.EDIFICIO, { pisos: 8, porPiso: 4 }],
      [TipoRedVecinal.EDIFICIO, { torre: 'B', pisos: 8, porPiso: 4 }],
      [TipoRedVecinal.CONDOMINIO, { norte: 10 }],
      [TipoRedVecinal.CONDOMINIO, { norte: 10, sur: 0 }],
      [TipoRedVecinal.VILLA, { manzanas: 3, casasPorManzana: 20 }],
    ])('debe aceptar %s con %j', (tipo, estructura) => {
      expect(errorEstructura(tipo, estructura)).toBeNull();
    });

    it.each([
      [TipoRedVecinal.EDIFICIO, { porPiso: 4 }, 'Indica la cantidad de pisos'],
      [
        TipoRedVecinal.EDIFICIO,
        { pisos: 4 },
        'Indica los departamentos por piso',
      ],
      [
        TipoRedVecinal.CONDOMINIO,
        { sur: 4 },
        'Indica las casas del lado norte',
      ],
      [TipoRedVecinal.VILLA, { manzanas: 2 }, 'Indica las casas por manzana'],
      [
        TipoRedVecinal.CONDOMINIO,
        { norte: 4, pisos: 3 },
        'pisos no corresponde a una comunidad de tipo Condominio',
      ],
      [
        TipoRedVecinal.VILLA,
        { manzanas: 1, casasPorManzana: 5, torre: 'A' },
        'torre no corresponde a una comunidad de tipo Villa',
      ],
    ])('con %s y %j debe responder «%s»', (tipo, estructura, mensaje) => {
      expect(errorEstructura(tipo, estructura)).toBe(mensaje);
    });

    it('debe dejar los campos desconocidos al ValidationPipe, sin un segundo mensaje', () => {
      expect(
        errorEstructura(TipoRedVecinal.CONDOMINIO, {
          norte: 4,
          hack: 1,
        } as never),
      ).toBeNull();
    });

    it('debe ignorar los campos presentes pero sin valor', () => {
      expect(
        errorEstructura(TipoRedVecinal.CONDOMINIO, {
          norte: 4,
          pisos: undefined,
        }),
      ).toBeNull();
    });
  });
});
