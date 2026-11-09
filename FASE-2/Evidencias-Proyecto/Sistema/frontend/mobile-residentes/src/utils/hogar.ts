// Cómo se muestra cada tipo de ficha de Mi hogar y qué campos pide, igual que reglas-ficha.ts del backend:
// - fecha: Mantención, Garantía, Pintura y Técnico (no futura);
// - fecha de vencimiento: obligatoria en Mantención y Garantía, y en nadie más;
// - detalle obligatorio en Pintura y Medida; nombre de contacto solo en Mantención; teléfono en Mantención y Técnico.
import type { Ionicons } from '@expo/vector-icons';
import type { FichaHogar, TipoFicha } from '@/api/tipos';
import { diasHasta, fecha } from './formato';

export const TIPOS_FICHA: TipoFicha[] = ['Mantención', 'Garantía', 'Pintura', 'Medida', 'Técnico', 'Otro'];
export const DIAS_AVISO = 30;

type Campos = {
  icono: keyof typeof Ionicons.glyphMap; plural: string;
  titulo: string; ejemploTitulo: string; detalle: string; ejemploDetalle: string; detalleObligatorio?: boolean;
  fecha?: string; vence?: string; contacto?: boolean; telefono?: boolean;
};

export const FICHA: Record<TipoFicha, Campos> = {
  Mantención: {
    icono: 'construct-outline', plural: 'Mantenciones', titulo: 'Equipo', ejemploTitulo: 'Calefont, aire acondicionado…',
    detalle: 'Notas (opcional)', ejemploDetalle: 'Dónde está, qué se cambió…', fecha: 'Última mantención (opcional)', vence: 'Próxima mantención', contacto: true, telefono: true,
  },
  Garantía: {
    icono: 'shield-checkmark-outline', plural: 'Garantías', titulo: 'Producto', ejemploTitulo: 'Refrigerador, horno…',
    detalle: 'Tienda y notas (opcional)', ejemploDetalle: 'Dónde se compró, dónde está la boleta…', fecha: 'Fecha de compra (opcional)', vence: 'Vence la garantía',
  },
  Pintura: {
    icono: 'color-palette-outline', plural: 'Pintura', titulo: 'Dónde', ejemploTitulo: 'Living, dormitorio…',
    detalle: 'Marca, código del color y acabado', ejemploDetalle: 'Sherwin Williams SW 7036, látex mate', detalleObligatorio: true, fecha: 'Cuándo se pintó (opcional)',
  },
  Medida: {
    icono: 'resize-outline', plural: 'Medidas', titulo: 'Qué se midió', ejemploTitulo: 'Ventana del dormitorio…',
    detalle: 'Medidas', ejemploDetalle: '120 × 140 cm (ancho × alto)', detalleObligatorio: true,
  },
  Técnico: {
    icono: 'person-outline', plural: 'Técnicos', titulo: 'Nombre', ejemploTitulo: 'Hugo Pinto',
    detalle: 'Oficio y qué hizo (opcional)', ejemploDetalle: 'Gasfíter, cambió la válvula del calefont', fecha: 'Cuándo vino (opcional)', telefono: true,
  },
  // Notas libres (la lista del supermercado, la clave del wifi de las visitas…)
  Otro: {
    icono: 'document-text-outline', plural: 'Otros', titulo: 'Título', ejemploTitulo: 'Lista del supermercado',
    detalle: 'Lo que quieras anotar (opcional)', ejemploDetalle: 'Una cosa por línea',
  },
};

// Lo que se lee bajo el título en la lista
export function resumen(f: FichaHogar) {
  if (f.tipo === 'Técnico') return [f.detalle?.split('.')[0], f.fecha && `vino el ${fecha(f.fecha)}`].filter(Boolean).join(' · ');
  if (f.tipo === 'Mantención' && f.fecha) return `Última el ${fecha(f.fecha)}`;
  if (f.tipo === 'Garantía' && f.fechaVence) return [f.detalle?.split('.')[0], `vence el ${fecha(f.fechaVence)}${f.fechaVence.slice(0, 4) === String(new Date().getFullYear()) ? '' : ` de ${f.fechaVence.slice(0, 4)}`}`].filter(Boolean).join(' · ');
  // Una nota de varias líneas (como una lista) se resume en las primeras
  if (f.tipo === 'Otro' && f.detalle?.includes('\n')) {
    const l = f.detalle.split('\n').map((x) => x.trim()).filter(Boolean);
    return l.length > 3 ? `${l.slice(0, 3).join(', ')} y ${l.length - 3} más` : l.join(', ');
  }
  return f.detalle?.split('\n')[0] ?? '';
}

// "En 12 días", "Vence hoy", "Venció hace 5 días"; tono para la etiqueta
export function vencimiento(f: FichaHogar): { texto: string; tono: 'warn' | 'bad' | 'neutro' } | null {
  if (!f.fechaVence) return null;
  const d = diasHasta(f.fechaVence);
  const que = f.tipo === 'Garantía' ? 'Vence' : 'Toca';
  if (d < 0) return { texto: f.tipo === 'Garantía' ? `Venció hace ${-d} ${-d === 1 ? 'día' : 'días'}` : `Atrasada ${-d} ${-d === 1 ? 'día' : 'días'}`, tono: 'bad' };
  if (d === 0) return { texto: `${que} hoy`, tono: 'warn' };
  if (d <= DIAS_AVISO) return { texto: `En ${d} ${d === 1 ? 'día' : 'días'}`, tono: 'warn' };
  const anio = f.fechaVence.slice(0, 4) === String(new Date().getFullYear()) ? '' : ` de ${f.fechaVence.slice(0, 4)}`;
  return { texto: `${que} el ${fecha(f.fechaVence)}${anio}`, tono: 'neutro' };
}

// Fichas con vencimiento dentro de 30 días (o ya vencidas), la más urgente primero
export const porVencer = (fichas: FichaHogar[]) => fichas
  .filter((f) => f.fechaVence && diasHasta(f.fechaVence) <= DIAS_AVISO)
  .sort((a, b) => (a.fechaVence as string).localeCompare(b.fechaVence as string));
