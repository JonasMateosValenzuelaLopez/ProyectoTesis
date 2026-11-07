export function enmascararCorreo(correo: string): string {
  const arroba = correo.lastIndexOf('@');
  if (arroba <= 0) {
    return '***';
  }
  const usuario = correo.slice(0, arroba);
  const dominio = correo.slice(arroba);
  if (usuario.length <= 2) {
    return `${usuario[0]}***${dominio}`;
  }
  return `${usuario[0]}***${usuario[usuario.length - 1]}${dominio}`;
}
