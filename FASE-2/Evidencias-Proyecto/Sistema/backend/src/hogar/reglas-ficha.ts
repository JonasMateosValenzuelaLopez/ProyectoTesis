import { TipoFicha } from './entities/hogar-ficha.entity';

export const MAX_FICHAS_POR_UNIDAD = 300;

export const TIPOS_CON_FECHA = [
  TipoFicha.MANTENCION,
  TipoFicha.GARANTIA,
  TipoFicha.PINTURA,
  TipoFicha.TECNICO,
];
export const TIPOS_CON_VENCIMIENTO = [TipoFicha.MANTENCION, TipoFicha.GARANTIA];
export const TIPOS_CON_DETALLE_OBLIGATORIO = [
  TipoFicha.PINTURA,
  TipoFicha.MEDIDA,
];
export const TIPOS_CON_NOMBRE_CONTACTO = [TipoFicha.MANTENCION];
export const TIPOS_CON_TELEFONO_CONTACTO = [
  TipoFicha.MANTENCION,
  TipoFicha.TECNICO,
];

export interface CamposFicha {
  tipo: TipoFicha;
  detalle?: string | null;
  contactoNombre?: string | null;
  contactoTelefono?: string | null;
  fecha?: string | null;
  fechaVence?: string | null;
}

export function errorCamposSegunTipo(campos: CamposFicha): string | null {
  const { tipo } = campos;
  if (!Object.values(TipoFicha).includes(tipo)) {
    return null;
  }
  if (TIPOS_CON_VENCIMIENTO.includes(tipo) && campos.fechaVence == null) {
    return `Una ficha de tipo ${tipo} requiere la fecha de vencimiento`;
  }
  if (!TIPOS_CON_VENCIMIENTO.includes(tipo) && campos.fechaVence != null) {
    return `Una ficha de tipo ${tipo} no lleva fecha de vencimiento`;
  }
  if (!TIPOS_CON_FECHA.includes(tipo) && campos.fecha != null) {
    return `Una ficha de tipo ${tipo} no lleva fecha`;
  }
  if (TIPOS_CON_DETALLE_OBLIGATORIO.includes(tipo) && campos.detalle == null) {
    return `Una ficha de tipo ${tipo} requiere el detalle`;
  }
  if (
    !TIPOS_CON_NOMBRE_CONTACTO.includes(tipo) &&
    campos.contactoNombre != null
  ) {
    return `Una ficha de tipo ${tipo} no lleva nombre de contacto`;
  }
  if (
    !TIPOS_CON_TELEFONO_CONTACTO.includes(tipo) &&
    campos.contactoTelefono != null
  ) {
    return `Una ficha de tipo ${tipo} no lleva teléfono de contacto`;
  }
  if (
    campos.fecha != null &&
    campos.fechaVence != null &&
    campos.fechaVence <= campos.fecha
  ) {
    return 'La fecha de vencimiento debe ser posterior a la fecha';
  }
  return null;
}
