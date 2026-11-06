import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { Votacion } from './entities/votacion.entity';
import {
  esDirectiva,
  estaAbierta,
  fechaCierre,
  finDelDia,
  resultado,
} from './reglas-votaciones';

const red = (roles: RolUsuario[]): ContextoRed => ({
  idRed: 3,
  roles,
  modulos: [],
  idsUnidades: [],
});

describe('reglas de votaciones', () => {
  describe('finDelDia', () => {
    it.each([
      ['2026-11-12', '2026-11-13T02:59:59.000Z'],
      ['2026-07-15', '2026-07-16T03:59:59.000Z'],
      ['2026-04-04', '2026-04-05T02:59:59.000Z'],
      ['2026-04-05', '2026-04-06T03:59:59.000Z'],
      ['2026-09-05', '2026-09-06T03:59:59.000Z'],
      ['2026-09-06', '2026-09-07T02:59:59.000Z'],
    ])('el %s debe cerrar a las 23:59:59 de Chile (%s)', (fecha, esperado) => {
      expect(finDelDia(fecha).toISOString()).toBe(esperado);
    });
  });

  describe('estaAbierta y fechaCierre', () => {
    const votacion = (cambios: Partial<Votacion> = {}) =>
      ({
        cierre: new Date('2026-11-13T02:59:59.000Z'),
        cerradaEn: null,
        ...cambios,
      }) as Votacion;

    it('debe estar abierta antes del cierre y cerrada después', () => {
      expect(estaAbierta(votacion(), new Date('2026-11-13T02:59:58Z'))).toBe(
        true,
      );
      expect(estaAbierta(votacion(), new Date('2026-11-13T02:59:59Z'))).toBe(
        false,
      );
    });

    it('debe quedar cerrada y con la fecha del cierre anticipado', () => {
      const cerrada = votacion({ cerradaEn: new Date('2026-11-06T15:00:00Z') });

      expect(estaAbierta(cerrada, new Date('2026-11-07T00:00:00Z'))).toBe(
        false,
      );
      expect(fechaCierre(cerrada)).toBe('2026-11-06');
      expect(fechaCierre(votacion())).toBe('2026-11-12');
    });
  });

  it.each([
    [[RolUsuario.SECRETARIO], true],
    [[RolUsuario.PRESIDENTE], true],
    [[RolUsuario.ADMINISTRADOR, RolUsuario.RESIDENTE], false],
  ])('con los cargos %j esDirectiva debe dar %s', (roles, esperado) => {
    expect(esDirectiva(red(roles))).toBe(esperado);
  });

  describe('resultado', () => {
    it('debe calcular participación, quórum y ganadora sobre todas las unidades', () => {
      expect(
        resultado(
          [
            { idOpcion: 1, votos: 3 },
            { idOpcion: 2, votos: 1 },
          ],
          8,
          50,
        ),
      ).toEqual({
        votos: 4,
        participacion: 50,
        faltan: 4,
        alcanzaQuorum: true,
        idOpcionGanadora: 1,
      });
    });

    it('no debe dar ganadora en un empate ni alcanzar un quórum mayor', () => {
      expect(
        resultado(
          [
            { idOpcion: 1, votos: 1 },
            { idOpcion: 2, votos: 1 },
          ],
          3,
          70,
        ),
      ).toEqual({
        votos: 2,
        participacion: 66.7,
        faltan: 1,
        alcanzaQuorum: false,
        idOpcionGanadora: null,
      });
    });

    it('no debe alcanzar el quórum cuando la participación real queda bajo él aunque redondeada lo iguale', () => {
      expect(
        resultado(
          [
            { idOpcion: 1, votos: 17 },
            { idOpcion: 2, votos: 0 },
          ],
          21,
          81,
        ),
      ).toEqual({
        votos: 17,
        participacion: 81,
        faltan: 4,
        alcanzaQuorum: false,
        idOpcionGanadora: null,
      });
    });

    it('no debe dar ganadora cuando la votación no alcanza el quórum', () => {
      expect(
        resultado(
          [
            { idOpcion: 1, votos: 2 },
            { idOpcion: 2, votos: 1 },
          ],
          10,
          50,
        ),
      ).toEqual({
        votos: 3,
        participacion: 30,
        faltan: 7,
        alcanzaQuorum: false,
        idOpcionGanadora: null,
      });
    });

    it('debe dar ganadora en una encuesta con cualquier participación', () => {
      expect(
        resultado(
          [
            { idOpcion: 1, votos: 1 },
            { idOpcion: 2, votos: 0 },
          ],
          10,
          null,
        ),
      ).toEqual({
        votos: 1,
        participacion: 10,
        faltan: 9,
        alcanzaQuorum: true,
        idOpcionGanadora: 1,
      });
    });

    it('debe considerar alcanzado el quórum de una encuesta y no fallar sin unidades', () => {
      expect(resultado([{ idOpcion: 1, votos: 0 }], 0, null)).toEqual({
        votos: 0,
        participacion: 0,
        faltan: 0,
        alcanzaQuorum: true,
        idOpcionGanadora: null,
      });
    });
  });
});
