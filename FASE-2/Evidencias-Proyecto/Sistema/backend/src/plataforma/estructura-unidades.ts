import { TipoRedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { TipoUnidad } from '../unidades/entities/unidad.entity';
import { UnidadNueva } from '../unidades/unidad-nueva';

export interface Estructura {
  torre?: string;
  pisos?: number;
  porPiso?: number;
  norte?: number;
  sur?: number;
  manzanas?: number;
  casasPorManzana?: number;
}

export interface UnidadGenerada extends UnidadNueva {
  orden: number;
}

const CAMPOS_POR_TIPO: Record<TipoRedVecinal, (keyof Estructura)[]> = {
  [TipoRedVecinal.EDIFICIO]: ['torre', 'pisos', 'porPiso'],
  [TipoRedVecinal.CONDOMINIO]: ['norte', 'sur'],
  [TipoRedVecinal.VILLA]: ['manzanas', 'casasPorManzana'],
};

const OBLIGATORIOS: Record<TipoRedVecinal, [keyof Estructura, string][]> = {
  [TipoRedVecinal.EDIFICIO]: [
    ['pisos', 'Indica la cantidad de pisos'],
    ['porPiso', 'Indica los departamentos por piso'],
  ],
  [TipoRedVecinal.CONDOMINIO]: [['norte', 'Indica las casas del lado norte']],
  [TipoRedVecinal.VILLA]: [
    ['manzanas', 'Indica la cantidad de manzanas'],
    ['casasPorManzana', 'Indica las casas por manzana'],
  ],
};

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function errorEstructura(
  tipo: TipoRedVecinal,
  estructura: Estructura,
): string | null {
  const permitidos = CAMPOS_POR_TIPO[tipo];
  const sobrante = Object.values(CAMPOS_POR_TIPO)
    .flat()
    .find(
      (campo) => estructura[campo] !== undefined && !permitidos.includes(campo),
    );
  if (sobrante) {
    return `${sobrante} no corresponde a una comunidad de tipo ${tipo}`;
  }
  const faltante = OBLIGATORIOS[tipo].find(
    ([campo]) => estructura[campo] === undefined,
  );
  return faltante ? faltante[1] : null;
}

export function generarUnidades(
  tipo: TipoRedVecinal,
  estructura: Estructura,
): UnidadGenerada[] {
  const unidades: UnidadNueva[] = [];
  if (tipo === TipoRedVecinal.EDIFICIO) {
    const torre = estructura.torre ?? 'A';
    for (let piso = 1; piso <= (estructura.pisos ?? 0); piso++) {
      for (let depto = 1; depto <= (estructura.porPiso ?? 0); depto++) {
        unidades.push({
          numeroIdentificador: `${piso}${String(depto).padStart(2, '0')}`,
          tipo: TipoUnidad.DEPARTAMENTO,
          callePasaje: `Torre ${torre}`,
          torre,
          piso,
          manzana: null,
        });
      }
    }
  } else if (tipo === TipoRedVecinal.CONDOMINIO) {
    const norte = estructura.norte ?? 0;
    const total = norte + (estructura.sur ?? 0);
    for (let numero = 1; numero <= total; numero++) {
      unidades.push({
        numeroIdentificador: String(numero),
        tipo: TipoUnidad.CASA,
        callePasaje: numero <= norte ? 'Lado norte' : 'Lado sur',
        torre: null,
        piso: null,
        manzana: null,
      });
    }
  } else {
    const casas = estructura.casasPorManzana ?? 0;
    LETRAS.slice(0, estructura.manzanas ?? 0)
      .split('')
      .forEach((letra, indice) => {
        for (let casa = 1; casa <= casas; casa++) {
          unidades.push({
            numeroIdentificador: String(indice * casas + casa),
            tipo: TipoUnidad.CASA,
            callePasaje: `Manzana ${letra}`,
            torre: null,
            piso: null,
            manzana: letra,
          });
        }
      });
  }
  return unidades.map((unidad, indice) => ({ ...unidad, orden: indice + 1 }));
}
