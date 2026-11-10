import { TipoRedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { TipoUnidad } from './entities/unidad.entity';
import { UnidadNueva } from './unidad-nueva';

export const MAX_UNIDADES_POR_LOTE = 500;

export interface LoteUnidades {
  torre?: string;
  pisoDesde?: number;
  pisoHasta?: number;
  porPiso?: number;
  grupo?: string;
  desde?: number;
  hasta?: number;
}

const CAMPOS_EDIFICIO: (keyof LoteUnidades)[] = [
  'torre',
  'pisoDesde',
  'pisoHasta',
  'porPiso',
];
const CAMPOS_CASAS: (keyof LoteUnidades)[] = ['grupo', 'desde', 'hasta'];

const NOMBRE_GRUPO: Record<TipoRedVecinal, string> = {
  [TipoRedVecinal.EDIFICIO]: 'la torre',
  [TipoRedVecinal.CONDOMINIO]: 'la hilera o pasaje',
  [TipoRedVecinal.VILLA]: 'la letra de la manzana',
};

const totalDelLote = (tipo: TipoRedVecinal, lote: LoteUnidades) =>
  tipo === TipoRedVecinal.EDIFICIO
    ? ((lote.pisoHasta ?? 0) - (lote.pisoDesde ?? 0) + 1) * (lote.porPiso ?? 0)
    : (lote.hasta ?? 0) - (lote.desde ?? 0) + 1;

export function errorLote(
  tipo: TipoRedVecinal,
  lote: LoteUnidades,
): string | null {
  const edificio = tipo === TipoRedVecinal.EDIFICIO;
  const permitidos = edificio ? CAMPOS_EDIFICIO : CAMPOS_CASAS;
  const sobrante = [...CAMPOS_EDIFICIO, ...CAMPOS_CASAS].find(
    (campo) => lote[campo] !== undefined && !permitidos.includes(campo),
  );
  if (sobrante) {
    return `${sobrante} no corresponde a una comunidad de tipo ${tipo}`;
  }
  const faltante = permitidos.find((campo) => lote[campo] === undefined);
  if (faltante) {
    return faltante === 'torre' || faltante === 'grupo'
      ? `Indica ${NOMBRE_GRUPO[tipo]}`
      : `Indica ${faltante}`;
  }
  if (tipo === TipoRedVecinal.VILLA && !/^[A-Z]{1,3}$/.test(lote.grupo ?? '')) {
    return 'La manzana debe ser de 1 a 3 letras';
  }
  if (edificio && (lote.pisoHasta ?? 0) < (lote.pisoDesde ?? 0)) {
    return 'El piso final no puede ser menor que el inicial';
  }
  if (!edificio && (lote.hasta ?? 0) < (lote.desde ?? 0)) {
    return 'El número final no puede ser menor que el inicial';
  }
  if (totalDelLote(tipo, lote) > MAX_UNIDADES_POR_LOTE) {
    return `Un lote puede crear hasta ${MAX_UNIDADES_POR_LOTE} unidades`;
  }
  return null;
}

export function generarLote(
  tipo: TipoRedVecinal,
  lote: LoteUnidades,
): UnidadNueva[] {
  if (tipo === TipoRedVecinal.EDIFICIO) {
    const torre = lote.torre ?? '';
    const unidades: UnidadNueva[] = [];
    for (
      let piso = lote.pisoDesde ?? 1;
      piso <= (lote.pisoHasta ?? 0);
      piso++
    ) {
      for (let depto = 1; depto <= (lote.porPiso ?? 0); depto++) {
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
    return unidades;
  }
  const villa = tipo === TipoRedVecinal.VILLA;
  const grupo = lote.grupo ?? '';
  const unidades: UnidadNueva[] = [];
  for (let numero = lote.desde ?? 1; numero <= (lote.hasta ?? 0); numero++) {
    unidades.push({
      numeroIdentificador: String(numero),
      tipo: TipoUnidad.CASA,
      callePasaje: villa ? `Manzana ${grupo}` : grupo,
      torre: null,
      piso: null,
      manzana: villa ? grupo : null,
    });
  }
  return unidades;
}
