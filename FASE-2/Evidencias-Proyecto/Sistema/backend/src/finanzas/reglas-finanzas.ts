import { RolUsuario } from '../common/enums/rol.enum';
import { fechaHoy } from '../common/utils/vigencia';
import { Cobro } from './entities/cobro.entity';
import { CobroUnidad, EstadoCobroUnidad } from './entities/cobro-unidad.entity';

export const GESTION_COBROS = [RolUsuario.TESORERO, RolUsuario.ADMINISTRADOR];

export const LECTURA_FINANZAS = [...GESTION_COBROS, RolUsuario.PRESIDENTE];

export const MAX_MONTO = 99_999_999;

export const periodoActual = (hoy: string = fechaHoy()) =>
  `${hoy.slice(0, 7)}-01`;

export const estaAtrasado = (
  cobroUnidad: Pick<CobroUnidad, 'estado'>,
  cobro: Pick<Cobro, 'fechaVencimiento'>,
  hoy: string = fechaHoy(),
) =>
  cobroUnidad.estado === EstadoCobroUnidad.PENDIENTE &&
  cobro.fechaVencimiento < hoy;

const formatoPesos = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export const pesos = (monto: number) => formatoPesos.format(monto);

export const fechaLegible = (fecha: string) =>
  fecha.split('-').reverse().join('-');
