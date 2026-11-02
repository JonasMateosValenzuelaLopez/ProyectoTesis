// Cómo se muestra cada tipo de ficha de Mi hogar y qué campos pide (filas de `hogar_fichas`)
import type { Ionicons } from '@expo/vector-icons';
import type { HogarFicha, TipoFicha } from '@/data/demo';
import { diasHasta, fecha } from './formato';

type Campos = {
  icono: keyof typeof Ionicons.glyphMap; plural: string;
  titulo: string; ejemploTitulo: string; detalle: string; ejemploDetalle: string;
  fecha?: string; vence?: string; contacto?: boolean; telefono?: boolean;
};

export const FICHA: Record<TipoFicha, Campos> = {
  Mantención: {
    icono: 'construct-outline', plural: 'Mantenciones', titulo: 'Equipo', ejemploTitulo: 'Calefont, aire acondicionado…',
    detalle: 'Notas (opcional)', ejemploDetalle: 'Dónde está, qué se cambió…', fecha: 'Última mantención', vence: 'Próxima mantención', contacto: true,
  },
  Garantía: {
    icono: 'shield-checkmark-outline', plural: 'Garantías', titulo: 'Producto', ejemploTitulo: 'Refrigerador, horno…',
    detalle: 'Tienda y notas (opcional)', ejemploDetalle: 'Dónde se compró, dónde está la boleta…', fecha: 'Fecha de compra', vence: 'Vence la garantía',
  },
  Pintura: {
    icono: 'color-palette-outline', plural: 'Pintura', titulo: 'Dónde', ejemploTitulo: 'Living, dormitorio…',
    detalle: 'Marca, código del color y acabado', ejemploDetalle: 'Sherwin Williams SW 7036, látex mate', fecha: 'Cuándo se pintó (opcional)',
  },
  Medida: {
    icono: 'resize-outline', plural: 'Medidas', titulo: 'Qué se midió', ejemploTitulo: 'Ventana del dormitorio…',
    detalle: 'Medidas', ejemploDetalle: '120 × 140 cm (ancho × alto)',
  },
  Técnico: {
    icono: 'person-outline', plural: 'Técnicos', titulo: 'Nombre', ejemploTitulo: 'Hugo Pinto',
    detalle: 'Oficio y qué hizo', ejemploDetalle: 'Gasfíter, cambió la válvula del calefont', fecha: 'Cuándo vino (opcional)', telefono: true,
  },
  // P10: notas libres (la lista del supermercado, la clave del wifi de las visitas…)
  Otro: {
    icono: 'document-text-outline', plural: 'Otros', titulo: 'Título', ejemploTitulo: 'Lista del supermercado',
    detalle: 'Lo que quieras anotar', ejemploDetalle: 'Una cosa por línea',
  },
};

// Lo que se lee bajo el título en la lista
export function resumen(f: HogarFicha) {
  if (f.tipo === 'Técnico') return [f.detalle?.split('.')[0], f.fecha && `vino el ${fecha(f.fecha)}`].filter(Boolean).join(' · ');
  if (f.tipo === 'Mantención' && f.fecha) return `Última el ${fecha(f.fecha)}`;
  if (f.tipo === 'Garantía' && f.fecha_vence) return [f.detalle?.split('.')[0], `vence el ${fecha(f.fecha_vence)}${f.fecha_vence.slice(0, 4) === String(new Date().getFullYear()) ? '' : ` de ${f.fecha_vence.slice(0, 4)}`}`].filter(Boolean).join(' · ');
  // Una nota de varias líneas (como una lista) se resume en las primeras
  if (f.tipo === 'Otro' && f.detalle?.includes('\n')) {
    const l = f.detalle.split('\n').map((x) => x.trim()).filter(Boolean);
    return l.length > 3 ? `${l.slice(0, 3).join(', ')} y ${l.length - 3} más` : l.join(', ');
  }
  return f.detalle?.split('\n')[0] ?? '';
}

// "En 12 días", "Vence hoy", "Venció hace 5 días"; tono para la etiqueta
export function vencimiento(f: HogarFicha): { texto: string; tono: 'warn' | 'bad' | 'neutro' } | null {
  if (!f.fecha_vence) return null;
  const d = diasHasta(f.fecha_vence);
  const que = f.tipo === 'Garantía' ? 'Vence' : 'Toca';
  if (d < 0) return { texto: f.tipo === 'Garantía' ? `Venció hace ${-d} ${-d === 1 ? 'día' : 'días'}` : `Atrasada ${-d} ${-d === 1 ? 'día' : 'días'}`, tono: 'bad' };
  if (d === 0) return { texto: `${que} hoy`, tono: 'warn' };
  if (d <= 30) return { texto: `En ${d} ${d === 1 ? 'día' : 'días'}`, tono: 'warn' };
  const anio = f.fecha_vence.slice(0, 4) === String(new Date().getFullYear()) ? '' : ` de ${f.fecha_vence.slice(0, 4)}`;
  return { texto: `${que} el ${fecha(f.fecha_vence)}${anio}`, tono: 'neutro' };
}
