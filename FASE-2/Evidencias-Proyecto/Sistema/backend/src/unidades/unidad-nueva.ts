import { TipoUnidad } from './entities/unidad.entity';

export interface UnidadNueva {
  numeroIdentificador: string;
  tipo: TipoUnidad;
  callePasaje: string;
  torre: string | null;
  piso: number | null;
  manzana: string | null;
}
