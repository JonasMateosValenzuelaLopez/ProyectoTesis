const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_POR_MES = 30.44;

function aUtc(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function aTexto(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function esFechaValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !FORMATO_FECHA.test(valor)) {
    return false;
  }
  return aTexto(aUtc(valor)) === valor;
}

export function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const ultimoDiaDestino = new Date(Date.UTC(anio, mes - 1 + meses + 1, 0));
  return aTexto(
    new Date(
      Date.UTC(
        ultimoDiaDestino.getUTCFullYear(),
        ultimoDiaDestino.getUTCMonth(),
        Math.min(dia, ultimoDiaDestino.getUTCDate()),
      ),
    ),
  );
}

export function mesesEntre(desde: string, hasta: string): number {
  return Math.round(
    (aUtc(hasta).getTime() - aUtc(desde).getTime()) / DIA_MS / DIAS_POR_MES,
  );
}

export function sumarDias(fecha: string, dias: number): string {
  return aTexto(new Date(aUtc(fecha).getTime() + dias * DIA_MS));
}
