// Formatos para Chile: pesos sin decimales y fechas en español.
const pesos = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const fechaCorta = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' });
const fechaLarga = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
const hora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

export const clp = (monto) => pesos.format(monto ?? 0);

// Acepta 'YYYY-MM-DD' (sin desfase de zona horaria) o un Date / ISO completo.
const aFecha = (valor) => (typeof valor === 'string' && valor.length === 10 ? new Date(`${valor}T12:00:00`) : new Date(valor));

export const fecha = (valor) => fechaCorta.format(aFecha(valor)).replace('.', '');
export const fechaCompleta = (valor) => fechaLarga.format(aFecha(valor));
export const fechaHora = (valor) => `${fecha(valor)} · ${hora.format(aFecha(valor))}`;

export const diasHasta = (valor, desde = new Date()) => {
  const ms = aFecha(valor).setHours(0, 0, 0, 0) - new Date(desde).setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
};

export const nombreUnidad = (u) => (u ? `${u.tipo === 'Departamento' ? 'Depto' : u.tipo} ${u.numero}` : '');

// Genera y descarga un CSV (separado por ; para que Excel en español lo abra bien).
export function descargarCSV(nombreArchivo, filas) {
  const celda = (v) => {
    const texto = String(v ?? '');
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const contenido = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}

export function saludo(ahora = new Date()) {
  const h = ahora.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export const hoyTexto = () => new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

export const horaMinuto = (valor) => hora.format(aFecha(valor));
