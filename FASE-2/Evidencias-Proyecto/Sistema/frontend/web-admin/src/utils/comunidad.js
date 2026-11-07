// Reglas de los datos de la comunidad, las mismas de la API (datos-comunidad.dto.ts y su servicio)
import { rutValido } from './rut';

export const TIPOS_CUENTA = ['Cuenta corriente', 'Cuenta vista', 'Cuenta RUT', 'Cuenta de ahorro'];
// La ven la administración y la directiva; solo la administración la edita
export const LECTORES_DATOS_COMUNIDAD = ['administrador', 'presidente', 'tesorero', 'secretario'];
// A quienes avisa la API por correo cuando cambia la cuenta para transferencias
export const AVISADOS_CAMBIO_CUENTA = ['administrador', 'presidente', 'tesorero'];
export const MAX_UMBRAL_VISADO = 9_999_999_999;

// Los cinco datos que necesita un residente para transferir: van todos o ninguno
const CAMPOS_CUENTA = ['banco', 'tipo_cuenta', 'numero_cuenta', 'titular_cuenta', 'rut_titular'];
const FALTA = {
  banco: 'Indica el banco', tipo_cuenta: 'Indica el tipo de cuenta', numero_cuenta: 'Indica el número de cuenta',
  titular_cuenta: 'Indica el titular de la cuenta', rut_titular: 'Indica el RUT del titular',
};
const LARGO = { nombre: 100, direccion: 150, banco: 60, numero_cuenta: 30, titular_cuenta: 100, correo_pagos: 100 };
const ETIQUETA = {
  nombre: 'El nombre', direccion: 'La dirección', banco: 'El banco', numero_cuenta: 'El número de cuenta',
  titular_cuenta: 'El titular', correo_pagos: 'El correo para comprobantes',
};
export const MENSAJE_CUENTA_INCOMPLETA = 'Para que los residentes puedan transferir, completa el banco, el tipo de cuenta, el número, el titular y su RUT. Si no quieres mostrar una cuenta, deja todos los datos vacíos.';

export const limpiarNumeroCuenta = (n) => n.replace(/[\s.]/g, '');
export const maxLargo = (campo) => LARGO[campo];

// «terminada en 5872», lo que muestra el correo de aviso (nunca el número completo)
export const enmascararCuenta = (numero) => (numero ? `terminada en ${numero.replace(/\D/g, '').slice(-4)}` : null);

// Devuelve { campo: mensaje } con el primer problema de cada campo, o {} si está todo bien
export function erroresDatosComunidad(f) {
  const e = {};
  if (!f.nombre.trim()) e.nombre = 'El nombre es obligatorio';
  if (!f.direccion.trim()) e.direccion = 'La dirección es obligatoria';
  Object.entries(LARGO).forEach(([campo, max]) => {
    if (!e[campo] && (f[campo] ?? '').trim().length > max) e[campo] = `${ETIQUETA[campo]} no puede superar ${max} caracteres`;
  });
  const numero = limpiarNumeroCuenta(f.numero_cuenta ?? '');
  if (numero && !/^(?=(?:-*\d){4})\d(?:-?\d)*$/.test(numero)) e.numero_cuenta = 'El número de cuenta debe tener al menos 4 dígitos y solo puede llevar dígitos y guiones';
  if (f.tipo_cuenta && !TIPOS_CUENTA.includes(f.tipo_cuenta)) e.tipo_cuenta = `El tipo de cuenta debe ser ${TIPOS_CUENTA.slice(0, -1).join(', ')} o ${TIPOS_CUENTA.at(-1)}`;
  if (f.rut_titular?.trim() && !rutValido(f.rut_titular)) e.rut_titular = 'El RUT del titular no es válido';
  if (f.correo_pagos?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.correo_pagos.trim())) e.correo_pagos = 'El correo para comprobantes no es válido';
  const llenos = CAMPOS_CUENTA.filter((c) => (f[c] ?? '').trim());
  if (llenos.length && llenos.length < CAMPOS_CUENTA.length) {
    CAMPOS_CUENTA.filter((c) => !(f[c] ?? '').trim()).forEach((c) => { e[c] ??= FALTA[c]; });
    e.cuenta = MENSAJE_CUENTA_INCOMPLETA;
  }
  return e;
}
