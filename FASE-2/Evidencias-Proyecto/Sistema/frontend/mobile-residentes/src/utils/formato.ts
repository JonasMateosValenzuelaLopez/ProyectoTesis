// Formatos para Chile: pesos sin decimales y fechas en español. Igual que en el panel web.
import { tipoUnidad, type Cuenta, type Unidad } from '@/data/demo';

const pesos = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const fechaCorta = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' });
const fechaLarga = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long' });
const diaSemana = new Intl.DateTimeFormat('es-CL', { weekday: 'short' });
const hora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

export const clp = (monto: number) => pesos.format(monto ?? 0);

// Acepta 'YYYY-MM-DD' (sin desfase de zona horaria) o un ISO completo.
const aFecha = (valor: string | Date) => (typeof valor === 'string' && valor.length === 10 ? new Date(`${valor}T12:00:00`) : new Date(valor));

export const fecha = (valor: string | Date) => fechaCorta.format(aFecha(valor)).replace('.', '');
export const fechaLargaTexto = (valor: string | Date) => fechaLarga.format(aFecha(valor));
export const horaMinuto = (valor: string | Date) => hora.format(aFecha(valor));
export const nombreDia = (valor: string | Date) => diaSemana.format(aFecha(valor)).replace('.', '');

export const diasHasta = (valor: string | Date, desde = new Date()) => {
  const ms = aFecha(valor).setHours(0, 0, 0, 0) - new Date(desde).setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
};

// "hoy", "mañana", "el jueves 29 oct"
export function cuando(valor: string | Date) {
  const d = diasHasta(valor);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  return `el ${nombreDia(valor)} ${fecha(valor)}`;
}

export function hace(valor: string) {
  const min = Math.round((Date.now() - new Date(valor).getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`;
  return fecha(valor);
}

export const nombreUnidad = (u?: Unidad) => (u ? `${tipoUnidad(u) === 'Departamento' ? 'Depto' : 'Casa'} ${u.numero_identificador}` : '');
// Nombre para mostrar de una fila de `usuarios`
export const nombreCompleto = (c: Pick<Cuenta, 'nombre' | 'apellido_paterno' | 'apellido_materno'>) => [c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ');

export function saludo(ahora = new Date()) {
  const h = ahora.getHours();
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}

// La base guarda +56961234501; en pantalla se lee +56 9 6123 4501
export const telefono = (t?: string | null) => {
  const m = t?.match(/^\+56(9)(\d{4})(\d{4})$/);
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : t ?? '';
};
