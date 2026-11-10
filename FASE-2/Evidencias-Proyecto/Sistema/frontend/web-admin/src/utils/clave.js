// Reglas de una contraseña nueva, las mismas de la API (EsPasswordNueva): al menos 8 caracteres,
// una letra y un número, y hasta 72 bytes (bcrypt no usa más; las tildes y la ñ ocupan 2).
const bytes = (texto) => new TextEncoder().encode(texto).length;

export function errorClaveNueva(clave) {
  if (clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (bytes(clave) > 72) return 'La contraseña no puede superar 72 caracteres (las tildes y la ñ cuentan doble).';
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(clave)) return 'La contraseña debe incluir al menos una letra.';
  if (!/\d/.test(clave)) return 'La contraseña debe incluir al menos un número.';
  return null;
}
