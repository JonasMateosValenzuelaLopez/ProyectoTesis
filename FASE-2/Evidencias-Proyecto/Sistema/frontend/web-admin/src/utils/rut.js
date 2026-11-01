// RUT chileno: formato 12.345.678-K y dígito verificador (módulo 11).
const limpiar = (rut) => String(rut).replace(/[^0-9kK]/g, '').toUpperCase();

export function formatearRut(rut) {
  const r = limpiar(rut);
  if (r.length < 2) return r;
  const cuerpo = r.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${r.slice(-1)}`;
}

export function digitoVerificador(cuerpo) {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (suma % 11);
  return dv === 11 ? '0' : dv === 10 ? 'K' : String(dv);
}

export function rutValido(rut) {
  const r = limpiar(rut);
  if (!/^\d{7,8}[0-9K]$/.test(r)) return false;
  return r.slice(-1) === digitoVerificador(r.slice(0, -1));
}
