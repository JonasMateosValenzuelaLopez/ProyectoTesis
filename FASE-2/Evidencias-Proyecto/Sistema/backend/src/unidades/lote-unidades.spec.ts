import { TipoRedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { TipoUnidad } from './entities/unidad.entity';
import { errorLote, generarLote } from './lote-unidades';

describe('lote de unidades', () => {
  describe('generarLote', () => {
    it('debe crear los departamentos de los pisos indicados en la torre', () => {
      const unidades = generarLote(TipoRedVecinal.EDIFICIO, {
        torre: 'B',
        pisoDesde: 9,
        pisoHasta: 10,
        porPiso: 2,
      });

      expect(unidades.map((u) => u.numeroIdentificador)).toEqual([
        '901',
        '902',
        '1001',
        '1002',
      ]);
      expect(unidades[0]).toEqual({
        numeroIdentificador: '901',
        tipo: TipoUnidad.DEPARTAMENTO,
        callePasaje: 'Torre B',
        torre: 'B',
        piso: 9,
        manzana: null,
      });
    });

    it('debe crear las casas del rango en la hilera o pasaje de un condominio', () => {
      const unidades = generarLote(TipoRedVecinal.CONDOMINIO, {
        grupo: 'Pasaje 2',
        desde: 16,
        hasta: 18,
      });

      expect(
        unidades.map((u) => [u.numeroIdentificador, u.callePasaje, u.tipo]),
      ).toEqual([
        ['16', 'Pasaje 2', TipoUnidad.CASA],
        ['17', 'Pasaje 2', TipoUnidad.CASA],
        ['18', 'Pasaje 2', TipoUnidad.CASA],
      ]);
      expect(
        unidades.every((u) => u.torre === null && u.manzana === null),
      ).toBe(true);
    });

    it('debe crear las casas del rango en la manzana de una villa', () => {
      const [casa] = generarLote(TipoRedVecinal.VILLA, {
        grupo: 'D',
        desde: 61,
        hasta: 61,
      });

      expect(casa).toEqual({
        numeroIdentificador: '61',
        tipo: TipoUnidad.CASA,
        callePasaje: 'Manzana D',
        torre: null,
        piso: null,
        manzana: 'D',
      });
    });
  });

  describe('errorLote', () => {
    it.each([
      [
        TipoRedVecinal.EDIFICIO,
        { torre: 'A', pisoDesde: 1, pisoHasta: 8, porPiso: 4 },
      ],
      [TipoRedVecinal.CONDOMINIO, { grupo: 'Lado sur', desde: 1, hasta: 500 }],
      [TipoRedVecinal.VILLA, { grupo: 'AB', desde: 1, hasta: 20 }],
    ])('debe aceptar %s con %j', (tipo, lote) => {
      expect(errorLote(tipo, lote)).toBeNull();
    });

    it.each([
      [
        TipoRedVecinal.EDIFICIO,
        { pisoDesde: 1, pisoHasta: 2, porPiso: 2 },
        'Indica la torre',
      ],
      [
        TipoRedVecinal.EDIFICIO,
        { torre: 'A', pisoHasta: 2, porPiso: 2 },
        'Indica pisoDesde',
      ],
      [
        TipoRedVecinal.CONDOMINIO,
        { desde: 1, hasta: 2 },
        'Indica la hilera o pasaje',
      ],
      [
        TipoRedVecinal.VILLA,
        { desde: 1, hasta: 2 },
        'Indica la letra de la manzana',
      ],
      [
        TipoRedVecinal.CONDOMINIO,
        { grupo: 'P', desde: 1, hasta: 2, torre: 'A' },
        'torre no corresponde a una comunidad de tipo Condominio',
      ],
      [
        TipoRedVecinal.EDIFICIO,
        { torre: 'A', pisoDesde: 1, pisoHasta: 2, porPiso: 2, desde: 1 },
        'desde no corresponde a una comunidad de tipo Edificio',
      ],
      [
        TipoRedVecinal.VILLA,
        { grupo: 'Manzana 1', desde: 1, hasta: 2 },
        'La manzana debe ser de 1 a 3 letras',
      ],
      [
        TipoRedVecinal.EDIFICIO,
        { torre: 'A', pisoDesde: 5, pisoHasta: 2, porPiso: 2 },
        'El piso final no puede ser menor que el inicial',
      ],
      [
        TipoRedVecinal.CONDOMINIO,
        { grupo: 'P', desde: 10, hasta: 9 },
        'El número final no puede ser menor que el inicial',
      ],
      [
        TipoRedVecinal.CONDOMINIO,
        { grupo: 'P', desde: 1, hasta: 501 },
        'Un lote puede crear hasta 500 unidades',
      ],
      [
        TipoRedVecinal.EDIFICIO,
        { torre: 'A', pisoDesde: 1, pisoHasta: 17, porPiso: 30 },
        'Un lote puede crear hasta 500 unidades',
      ],
    ])('con %s y %j debe responder «%s»', (tipo, lote, mensaje) => {
      expect(errorLote(tipo, lote)).toBe(mensaje);
    });
  });
});
