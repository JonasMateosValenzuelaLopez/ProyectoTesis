// Reglas de una contraseña nueva, las mismas de la API (EsPasswordNueva): al menos 8 caracteres,
// una letra y un número, y hasta 72 bytes (bcrypt no usa más; las tildes y la ñ ocupan 2).
const bytes = (texto: string) => Array.from(texto).reduce((n, c) => {
  const cp = c.codePointAt(0) ?? 0;
  return n + (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);
}, 0);

export function errorClaveNueva(clave: string): string | null {
  if (clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (bytes(clave) > 72) return 'La contraseña no puede superar 72 caracteres (las tildes y la ñ cuentan doble).';
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(clave)) return 'La contraseña debe incluir al menos una letra.';
  if (!/\d/.test(clave)) return 'La contraseña debe incluir al menos un número.';
  return null;
}
