export function normalizarRut(valor: string): string | null {
  const limpio = valor.replace(/[.\-\s]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) {
    return null;
  }
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

export function calcularDigitoVerificador(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

export function esRutValido(valor: string): boolean {
  const rut = normalizarRut(valor);
  if (!rut) {
    return false;
  }
  const [cuerpo, dv] = rut.split('-');
  return calcularDigitoVerificador(cuerpo) === dv;
}
